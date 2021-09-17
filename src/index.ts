import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import CryptoJS from "crypto-js";
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import fetch from 'node-fetch';


const app = express();
const port = isNaN(parseInt(process.argv[2], 10)) ? 3333 : parseInt(process.argv[2], 10);
const pathVar = path.resolve('config');
const pathTokenFile = path.resolve(pathVar, 'token.key');
const baseUrl = process.argv[3] || 'http://mafreebox.freebox.fr/api';
const appInfos = {
	app_id: "fr.freebox_gateway",
	app_name: "Freebox Gateway",
	app_version: "1.0.0",
	device_name: "Freebox Gateway"
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

const request = async (url: string, method: 'get'|'post'|'patch'|'put'|'delete' = 'get', body: any = null, headers: any = {}) => {
	
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
	
	const json = await (await fetch(final, params)).json();
	
	if (!json.success) {
		throw new ResponseError(json, 400, 'Une errror est survenue');
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
			await login();
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
		...(err.response ? { stack: err.response } : {}),
	});
}

app.use(bodyParser.json());
app.use(morgan("tiny"));

app.get('/', (req, res) => {
	res.send('Hello World!');
});


app.post('/password-generate', (req, res, next) => {
	challenge = req.body.challenge;
	res.json({
		password: passwordGenerate(req.body.token),
	});
});


app.post('/register', async (req, res, next) => {
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


app.post('/player-status/:playerId', async (req, res, next) => {
	try {
		await login();
		res.json(await request(`v6/player/${req.params.playerId}/api/v6/status/`));
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
