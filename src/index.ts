import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import CryptoJS from "crypto-js";
import minimist from 'minimist';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import fetch from 'node-fetch';

const rawArgv = process.argv.slice(2);
const args = minimist(rawArgv, {
	string: [
		'http-port',
		'base-url',
		'app-id',
		'app-name',
		'app-version',
		'device-name',
	],
	boolean: [
		'help',
	],
	alias: {
		'http-port': 'p',
		'base-url': 'u',
		'app-id': 'i',
		'app-name': 'n',
		'app-version': 'v',
		'device-name': 'd',
		'help': 'h',
	},
	default: {
		'http-port': '3333',
		'base-url': 'http://mafreebox.freebox.fr/api',
		'app-id': 'fr.freebox_gateway',
		'app-name': 'Freebox Gateway',
		'app-version': '1.0.0',
		'device-name': 'Freebox Gateway',
	}
});

if (args.h) {
	
	console.log(`
Run command:
    
    ${process.argv[0]} ${process.argv[0]} [PARAMS]
   
Parameters:
    
    http-port, p      Set server http port (default: 3333)
    base-url, u       Set api base url (default: http://mafreebox.freebox.fr/api) 
    app-id, i         Set api app id (default: fr.freebox_gateway)   
    app-name, n       Set api app name (default: Freebox Gateway)
    app-version, v    Set api app version (default: 1.0.0)
    device-name, d    Set api device name (default: Freebox Gateway)
    help, h           Display help
    
	`);
	process.exit(0);
}


const app = express();
const port = isNaN(parseInt(args.p, 10)) ? 3333 : parseInt(args.p, 10);
const pathVar = path.resolve('config');
const pathTokenFile = path.resolve(pathVar, 'token.key');
const baseUrl = args.u;
const appInfos = {
	app_id: args.i,
	app_name: args.n,
	app_version: args.v,
	device_name: args.d,
};


let challenge: string = null;
let token: string = null;
let tokenDT: Date = null;

class StatusError extends Error {
	public constructor(
		public status: number,
		message?: string
	) {
		super(message);
	}
}
class ResponseError extends StatusError {
	public constructor(
		public response: any,
		status: number,
		message?: string
	) {
		super(status, message);
	}
}

const request = async (url: string, method: 'get'|'post'|'patch'|'put'|'delete' = 'get', body: any = null, headers: any = {}, retry = 0) => {
	
	const final = `${baseUrl}/${url}`;
	const params = {
		...{
			method: method,
			headers: {
				'content-type': 'application/json',
				...(token ? { 'X-Fbx-App-Auth': token } : {}),
				...headers,
			}
		},
		...(body ? { body: JSON.stringify(body) } : {}),
	};
	
	
	console.log('CALL:', final, params);
	
	const reponse = await fetch(final, params);
	const json = await reponse.json();
	
	if (!json.success) {
		if (json.error_code === 'invalid_token' && retry < 1) {
			console.log('Invalid token', token);
			challenge = null;
			token = null;
			await login();
			return await request(url, method, body, headers, retry + 1);
		}
		
		throw new ResponseError(json, reponse.status >= 3000 ? reponse.status : 400, 'Une errror est survenue');
	}
	if (json.result && json.result.challenge) {
		challenge = json.result.challenge;
	}
	
	return json;
};

const login = async (retry = 0) => {
	
	if (token && (new Date).getTime() - tokenDT.getTime() <= (5 * 60 * 1000)) {
		return;
	}
	console.log('Not loged, login start');
	
	let tokenApp: string = null;
	
	if (fs.existsSync(pathTokenFile)) {
		tokenApp = fs.readFileSync(pathTokenFile).toString();
	}
	
	if (!tokenApp) {
		throw new StatusError(401, 'App token not found');
	}
	
	try {
		if (!challenge) {
			await request('v8/login/');
		}
		const response = await request('v8/login/session/', 'post', {
			"app_id": appInfos.app_id,
			"password": passwordGenerate(tokenApp),
		});
		
		token = response.result.session_token;
		tokenDT = new Date();
		
	} catch (e) {
		retry++;
		console.log('Error login retry', retry);
		if (retry < 4) {
			await login(retry + 1);
		} else {
			throw e;
		}
	}
};


const passwordGenerate = (tokenApp: string) => {
	return CryptoJS.HmacSHA1(challenge, tokenApp).toString();
};

const errorHandler = (err, req, res, next) => {
	challenge = null;
	console.error(err);
	res.status(err.status || 500).json({
		error: err.message || err.toString(),
		...(err.stack ? { stack: err.stack } : {}),
		...(err.response ? { response: err.response } : {}),
	});
}

app.use(bodyParser.json());
app.use(morgan("tiny"));

app.get('/', (req, res) => {
	res.send('Hello World!');
});


app.get('/register', async (req, res, next) => {
	try {
		
		const resultRequest = await request(`v8/login/authorize/`, 'post', appInfos);
		
		
		const callResponse = async () => {
			const resultResponse = await request(`v8/login/authorize/${resultRequest.result.track_id}`);
			console.log(resultResponse);
						
			await new Promise(r => setTimeout(r, 1000));
			
			if (resultResponse.result.status === 'pending') {
				return await callResponse();
			} else
			if (resultResponse.result.status !== 'granted') {
				throw new  StatusError(400, 'Accès refusé');
			}
		};
		
		await callResponse();
		
		fs.writeFileSync(pathTokenFile, resultRequest.result.app_token);
		
		res.json({ success: true });
		
	} catch (e) {
		errorHandler(e, req, res, next);
	}
});


app.use(async (req, res, next) => {
	try {
		console.log('Gateway url');
		await login();
		const url = req.url[0] === '/' ? req.url.substr(1) : req.url;
		res.json(
			await request(url, req.method as any, ['get', 'head'].indexOf(req.method.toLowerCase()) === -1 ? req.body : null, req.headers)
		);
	} catch (e) {
		errorHandler(e, req, res, next);
	}
});

app.use(errorHandler);


(async () => {
	
	mkdirp(pathVar);

	app.listen(port, () => {
		console.log(`Example app listening at http://localhost:${port}`);
	});


}) ();



//await fetch('http://192.168.0.192/pub/remote_control?code=88412582&key=home&long=true')
