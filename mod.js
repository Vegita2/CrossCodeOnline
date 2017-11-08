'use strict';

const CONFIG = require('../assets/mods/multiplayer/config.js');
const VAR_NAMES = {
	anims: 'Nh',
	image: 'bd',
	tint: 'j9',
	empty: 'aU'
};

if (!CONFIG.playerName) {
	CONFIG.playerName = '' + Math.round((Math.random() * Math.pow(10, 10)));
}

document.body.addEventListener('modsLoaded', () => {
	console.log('multiplayer test');
	
	
	let players = new PlayerContainer();
	let anims = new AnimationContainer();
	let connection = new WebsocketConnection(CONFIG.url, data => {
		players.setPlayer(data, anims);
	});
	
	
	simplify.registerUpdate(() => {
		anims.update();
		connection.update();
		players.update();
	});
	
	let originalLoad = cc.ig.gameMain[cc.ig.varNames.gameMainLoadMap];
	cc.ig.gameMain[cc.ig.varNames.gameMainLoadMap] = data => {
		let result = originalLoad.apply(cc.ig.gameMain, [data]);
		players.mapEnter();
		return result;
	};
});

class PlayerContainer {
	constructor() {
		this.players = {};
		this.settings = {
			"name": "multiplayeree",
			"characterName": "main.lea",
			"analyzable": {
				"text": {
					"en_US": "Multiplayer",
					"de_DE": "Multiplayer",
					"fr_FR": "Multiplayer",
					"zh_CN": "Multiplayer",
					"ja_JP": "ja_JP",
					"langUid": 213,
					"ko_KR": ""
				},
				"active": ""
			},
			"npcStates": [
				{
					"reactType": "FIXED_FACE",
					"face": "SOUTH",
					"action": [],
					"hidden": false,
					"condition": "      ",
					"config": "normal",
					"event": {}
				}
			],
			"mapId": 1337
		};
	}
	
	update() {
	
	}
	
	setPlayer(data, animContainer) {
		if (data.name === CONFIG.playerName || !simplify.getActiveMapName() || !cc.ig.playerInstance()) {
			return;
		}
		
		// generate if not existent
		let entity = this.players[data.name];
		if (!entity) {
			entity = this.generate();
			this.players[data.name] = entity;
			
			entity.analyzableTest = this.generateAnalyzable(data.name);
		}
		
		if (data.map !== simplify.getActiveMapName()) {
			Helper.setPos(entity, {
				x: 0,
				y: 0,
				z: 20000
			});
			return;
		}
		
		// build animation data
		entity[cc.ig.varNames.currentAnimation] = data.currentAnim;
		entity[cc.ig.varNames.animationState] = data.animState;
		
		let anim = data.anim[VAR_NAMES.anims][0];
		anim.sheet = animContainer.images[anim.sheet];
		if (anim.sheet) {
			Object.assign(entity[cc.ig.varNames.animation][VAR_NAMES.anims][0], data.anim[VAR_NAMES.anims][0]);
			delete data.anim[VAR_NAMES.anims];
			
			// if (data.anim[varNames.tint].length > 0){
			// 	Object.assign(entity[cc.ig.varNames.animation][varNames.tint][0].color, data.anim[varNames.tint][0].color);
			// 	delete data.anim[varNames.tint][0].color;
			//
			// 	Object.assign(entity[cc.ig.varNames.animation][varNames.tint][0], data.anim[varNames.tint][0]);
			// 	delete data.anim[varNames.tint];
			// }
			Object.assign(entity[cc.ig.varNames.animation], data.anim);
		}
		// data.pos.x += 80;
		Helper.setPos(entity, data.pos);
	}
	
	generate() {
		return cc.ig.gameMain.spawnEntity('JumpPanel', -9000, 0, 0, {
			jumpHeight: '2',
			condition: 'false'
		});
		// return cc.ig.gameMain.spawnEntity('NPC', 0, 0, 20000, this.settings);
	}
	
	generateAnalyzable(name) {
		return cc.ig.gameMain.spawnEntity('Analyzable', -9000, 0, 0, {
			name: '',
			color: 'BLUE',
			showType: 'DEFAULT',
			text: {
				en_US: name,
				langUid: '58'
			},
			mapId: 189,
			visible: '',
			spawnCondition: 'true'
		});
	}
	
	mapEnter() {
		console.log('map enter');
		this.players = {};
	}
}

class WebsocketConnection {
	
	constructor(url, onmessage) {
		this.updateInterval = 1;
		this.webSocket = new WebSocket(url);
		this.onmessage = onmessage;
		
		this.webSocket.onmessage = event => {
			onmessage(JSON.parse(event.data));
		};
		this.webSocket.onopen = event => {
			console.log("connection opened");
		};
		this.webSocket.onerror = event => {
			console.log("Error!");
			console.log(event);
		};
	}
	
	update() {
		let player = cc.ig.playerInstance();
		let mapName = simplify.getActiveMapName();
		if (!player || !mapName) {
			return;
		}
		
		if (this.webSocket.readyState !== WebSocket.OPEN) {
			console.error('websocket not opened!');
			return;
		}
		
		let data = {
			map: mapName,
			name: CONFIG.playerName,
			pos: Helper.getPos(player)
		};
		data.anim = Object.assign({}, player[cc.ig.varNames.animation]);
		let cpy = Object.assign({}, data.anim[VAR_NAMES.anims][0]);
		cpy.sheet = cpy.sheet[VAR_NAMES.image].path;
		data.anim[VAR_NAMES.anims] = [cpy];
		
		data.anim[VAR_NAMES.tint] = [];
		data.anim[VAR_NAMES.empty] = [];
		
		// data.currentAnim = player[cc.ig.varNames.currentAnimation];
		// data.animState = player[cc.ig.varNames.animationState];
		
		this.webSocket.send(JSON.stringify(data));
	}
}

class AnimationContainer {
	constructor() {
		this.images = {};
	}
	
	update() {
		let player = cc.ig.playerInstance();
		if (!player) {
			return;
		}
		let sheet = player[cc.ig.varNames.animation][VAR_NAMES.anims][0].sheet;
		let sheetName = sheet[VAR_NAMES.image].path;
		if (!this.images[sheetName]) {
			this.images[sheetName] = sheet;
			console.log(sheetName);
		}
	}
}

class Helper {
	
	static setPos(entity, pos) {
		Helper.assign(entity[cc.ig.varNames.entityData][cc.ig.varNames.entityPosition], pos);
		if (entity.analyzableTest) {
			let otherPos = {
				x: pos.x,
				y: pos.y - 13,
				z: pos.z
			};
			Helper.assign(entity.analyzableTest[cc.ig.varNames.entityData][cc.ig.varNames.entityPosition], otherPos);
		}
	}
	
	static getPos(entity) {
		return cc.ig.gameMain.getEntityPosition(entity);
	}
	
	static assign(a, b) {
		a = a || {};
		a.x = b.x;
		a.y = b.y;
		a.z = b.z;
		return a;
	}
	
	static nwjs() {
		var cc = frame.contentWindow.cc;
		var player = cc.ig.playerInstance();
		var anim = player.Xa;
	}
}