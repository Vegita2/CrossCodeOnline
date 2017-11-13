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
	
	let server = new WebSocketServer();
	server.setupUi();
	let players = new PlayerContainer();
	let anims = new AnimationContainer();
	let client = new WebSocketClient(data => {
		if(data.message && data.name !== CONFIG.playerName) {
			global.ccOnline.client.processMessage(data.name, data.message)
		}
		if(data.name) {
			global.ccOnline.playerLocation[data.name] = data.map;
		}
		players.setPlayer(data, anims);
	});
	let msg1 = new MessageBox(document.body)
	msg1.init()
	global.ccOnline = {
		config: CONFIG,
		players: players,
		anims: anims,
		server: server,
		client: client,
		playerLocation: {}
	};
	
	
	simplify.registerUpdate(() => {
		anims.update();
		client.update();
		players.update();
	});
	
	let originalLoad = cc.ig.gameMain[cc.ig.varNames.gameMainLoadMap];
	cc.ig.gameMain[cc.ig.varNames.gameMainLoadMap] = data => {
		let result = originalLoad.apply(cc.ig.gameMain, [data]);
		players.mapEnter();
		return result;
	};
});
class MessageBox {
	let cmd, messageBox,commandLine;
	let _instance = this
	constructor(Window) {
		cmd = document.createElement("div");
		cmd.style.position = "absolute"
		cmd.onkeypress = function(event) {
			if(event.ctrlKey && 
			   String.fromCharCode(event.which + 96).toLowerCase() === 'e') {
				_instance.hide()   
			   }
		}
		Window.appendChild(cmd)
		//What the user will see
		messageBox = document.createElement("div")
		//Set up the design
		messageBox.style.width = "30vw";
		messageBox.style.height = "30vw";
		messageBox.style["overflow-y"] = "auto";
		messageBox.style["overflow-x"] = "hidden";
		cmd.appendChild(messageBox)
		//What the user will be typing from
		commandLine = document.createElement("input")
		commandLine.type = "text"
		
		commandLine.onkeypress = function(event) {
			if(event.keyCode === 13 && this.value) {
				global.ccOnline.client.processMessage("You", this.value)
				this.value = null
			}
		}
		cmd.appendChild(commandLine)
	}
	show() {
		cmd.hidden = false
	}
	hide() {
		cmd.hidden = true
		this.blur()
	}
	focus() {
		this.show()
		commandLine.focus()
	}
	blur() {
		commandLine.value = null
		commandLine.blur()
	}
	say(user, message) {
		var messageElement = document.createElement("span")
		messageElement.innerHTML = user + ":" + message + "<br />"
		messageBox.appendChild(messageElement)
	}
	error(message) {
		var messageElement = document.createElement("span")
		messageElement.innerHTML = message + "<br />"
		messageBox.appendChild(messageElement)
	}
}

class PlayerContainer {
	constructor() {
		this.players = {};
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

class WebSocketClient {
	
	constructor(onmessage) {
		const _instance = this
		this.processMessage = function(user,message) {
			if(message.toLowerCase().indexOf("/") === 0) {
				processCommand(message)
			}
			else if(message.length){
				_instance.message = message;
				let playerName = global.ccOnline.config.playerName
				msg1.say(playerName, message)	
				_instance.message = ""
			}
		}
		document.addEventListener("keyup", function() {
			if(String.fromCharCode(event.keyCode).toLowerCase() == 'm') {
				msg1.focus()	
			}
		})
		this.onmessage = onmessage;
	}
	
	connect(playerName, url, onopen, onerror) {
		CONFIG.playerName = playerName;
		
		this.updateInterval = 1;
		if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
			this.webSocket.close();
			this.webSocket = null;
		}
		
		this.webSocket = new WebSocket(url);
		
		this.webSocket.onmessage = event => {
			this.onmessage(JSON.parse(event.data));
		};
		this.webSocket.onopen = event => {
			console.log("connection opened");
			this.webSocket.send(JSON.stringify({
				playerName : CONFIG.playerName,
				message : "> has connected"
			}))
			if (onopen) {
				onopen(event);
			}
		};
		this.webSocket.onerror = event => {
			console.log("Error!");
			console.log(event);
			if (onerror) {
				onerror(event);
			}
		};
	}
	
	update() {
		let player = cc.ig.playerInstance();
		let mapName = simplify.getActiveMapName();
		if (!player || !mapName || !this.webSocket) {
			msg1.hide()
			return;
		}
		
		if (this.webSocket.readyState !== WebSocket.OPEN) {
			console.error('websocket not opened!');
			msg1.hide()
			return;
		}
		
		let data = {
			map: mapName,
			name: CONFIG.playerName,
			pos: Helper.getPos(player)
		};
		if(this.message) {
			data['message'] = this.message
			this.message = ""
		}
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
		this.hasAll = false;
	}
	
	update() {
		if (this.hasAll) {
			return;
		}
		let player = cc.ig.playerInstance();
		if (!player) {
			return;
		}
		let sheet = player[cc.ig.varNames.animation][VAR_NAMES.anims][0].sheet;
		let sheetName = sheet[VAR_NAMES.image].path;
		if (!this.images[sheetName]) {
			this.images[sheetName] = sheet;
			console.log(sheetName);
			
			let size = 0, key;
			for (key in this.images) {
				if (this.images.hasOwnProperty(key)) size++;
			}
			if (size >= 2) {
				this.hasAll = true;
			}
		}
	}
}

class WebSocketServer {
	setupUi() {
		let gui = require('nw.gui');
		let mainWin = gui.Window.get();
		let newWin = gui.Window.open('../assets/mods/multiplayer/webSocket.html', {
			width: 700,
			height: 500
		});
		
		// mainWin.on('close', () => {
		// 	gui.App.quit();
		// })
	}
	
	startServer(port) {
		let Server = require('../assets/mods/multiplayer/simplewebsocket.min.js');
		console.log(Server);
		console.log('start server');
		if (this.server) {
			this.server.close();
			this.server = null;
		}
		this.server = new Server({port: port});
		this.server.on('connection', function (socket) {
			socket.on('data', data => console.log(data));
		})
	}
}

class Helper {
	static processCommand(message){
		var command = message.split(" ")[0].replace("/", "")
		var args = message.split(" ").splice(1)
		if(command === "t") {
			Helper.teleportTo(args[0])
		}
	}
	static teleportTo(player) {
		var map = global.ccOnline.playerLocation[player]
		if(map) {
			new cc.ig.events.TELEPORT({
				map : map
			}).start()
		} else {
			msg1.error('Could not find "' + player + '". Maybe they disconnected?')
		}
	}
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