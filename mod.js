'use strict';

const CONFIG = require('../assets/mods/multiplayer/config.js');


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
	global.ccOnline = {
		config: CONFIG,
		players: players,
		anims: anims,
		server: server,
		client: client,
		playerLocation: {},
		messageHandler: new MessageBox(document.body)
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
	constructor(Window) {
		let _instance = this
		this.cmd = document.createElement("div");
		this.cmd.style.position = "absolute"
		this.cmd.onkeypress = function(event) {
			if(event.ctrlKey && 
			   String.fromCharCode(event.which + 96).toLowerCase() === 'e') {
				_instance.hide()   
			   }
		}
		Window.appendChild(this.cmd)
		//What the user will see
		this.messageBox = document.createElement("div")
		//Set up the design
		this.messageBox.style.width = "30vw";
		this.messageBox.style.height = "30vw";
		this.messageBox.style["overflow-y"] = "auto";
		this.messageBox.style["overflow-x"] = "hidden";
		this.cmd.appendChild(this.messageBox)
		//What the user will be typing from
		this.commandLine = document.createElement("input")
		this.commandLine.type = "text"
		this.commandLine.onkeypress = function(event) {
			if(event.keyCode === 13 && this.value) {
				if(global.ccOnline.client.processMessage("You", this.value))
					global.ccOnline.client.setMessage(this.value)
				_instance.messageBox.scrollTop = _instance.messageBox.scrollHeight;
				this.value = null
			}
		}
		this.cmd.hidden = true
		this.cmd.appendChild(this.commandLine)
	}
	show() {
		this.cmd.hidden = false
	}
	hide() {
		this.cmd.hidden = true
		this.blur()
	}
	focus() {
		this.show()
		this.commandLine.focus()
	}
	blur() {
		this.commandLine.value = null
		this.commandLine.blur()
	}
	say(user, message) {
		var messageElement = document.createElement("span")
		messageElement.innerHTML = user + ":" + message + "<br />"
		this.messageBox.appendChild(messageElement)
	}
	error(message) {
		var messageElement = document.createElement("span")
		messageElement.innerHTML = message + "<br />"
		this.messageBox.appendChild(messageElement)
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
		
		let anim = data.anim[cc.ig.varNames.anims][0];
		anim.sheet = animContainer.images[anim.sheet];
		if (anim.sheet) {
			Object.assign(entity[cc.ig.varNames.animation][cc.ig.varNames.anims][0], data.anim[cc.ig.varNames.anims][0]);
			delete data.anim[cc.ig.varNames.anims];
			
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
		this.processMessage = function(user,message) {
			if(message.toLowerCase().indexOf("/") === 0) {
				Helper.processCommand(message)
				return false;
			}
			else if(message.length){
				global.ccOnline.messageHandler.say(user, message)
			}
			return true;
		}
		this.setMessage = function(newMessage) {
			this.message = newMessage
		}
		document.addEventListener("keyup", function() {
			if(String.fromCharCode(event.keyCode).toLowerCase() == 'm') {
				global.ccOnline.messageHandler.focus()	
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
				name : CONFIG.playerName,
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
		
		if(!this.webSocket) {
			return;
		}
		if (this.webSocket.readyState !== WebSocket.OPEN) {
			console.error('websocket not opened!');
			global.ccOnline.messageHandler.hide()
			return;
		} else if(this.message) {
			this.webSocket.send(JSON.stringify({
				message : this.message,
				name : CONFIG.playerName
			}))
			this.message = null
		}
		if (!player || !mapName) {
			return;
		}
		//Hacky fix to determine whether in menu...
		if(!cc.sc.stats.get("player").playtime) {
			Helper.disableCommand()
			return;
		}
		if(!Helper.canCommand)
			Helper.enableCommand()
		let data = {
			map: mapName,
			name: CONFIG.playerName,
			pos: Helper.getPos(player)
		};
		
		data.anim = Object.assign({}, player[cc.ig.varNames.animation]);
		let cpy = Object.assign({}, data.anim[cc.ig.varNames.anims][0]);
		cpy.sheet = cpy.sheet[cc.ig.varNames.image].path;
		data.anim[cc.ig.varNames.anims] = [cpy];
		
		data.anim[cc.ig.varNames.tint] = [];
		data.anim[cc.ig.varNames.empty] = [];
		
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
		let sheet = player[cc.ig.varNames.animation][cc.ig.varNames.anims][0].sheet;
		let sheetName = sheet[cc.ig.varNames.image].path;
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
function Help (){
	return Helper.canCommand
}
class Helper {
	static disableCommand() {
		Helper.canCommand = false;
	}
	static enableCommand() {
		Helper.canCommand = true;
	}
	static processCommand(message){
		if(!Helper.canCommand) {
			global.ccOnline.messageHandler.error("Commands are disabled.")
			return false	
		}
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
			global.ccOnline.messageHandler.error('Could not find "' + player + '". Maybe they disconnected?')
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