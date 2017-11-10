'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CONFIG = require('../assets/mods/multiplayer/config.js');
var VAR_NAMES = {
	anims: 'Nh',
	image: 'bd',
	tint: 'j9',
	empty: 'aU'
};

if (!CONFIG.playerName) {
	CONFIG.playerName = '' + Math.round(Math.random() * Math.pow(10, 10));
}

document.body.addEventListener('modsLoaded', function () {
	console.log('multiplayer test');

	var server = new WebSocketServer();
	server.setupUi();
	var players = new PlayerContainer();
	var anims = new AnimationContainer();
	var client = new WebSocketClient(function (data) {
		if(data.message) {
			showMessage(data.message)
		}
		players.setPlayer(data, anims);
	});

	global.ccOnline = {
		config: CONFIG,
		players: players,
		anims: anims,
		server: server,
		client: client
	};

	simplify.registerUpdate(function () {
		anims.update();
		client.update();
		players.update();
	});

	var originalLoad = cc.ig.gameMain[cc.ig.varNames.gameMainLoadMap];
	cc.ig.gameMain[cc.ig.varNames.gameMainLoadMap] = function (data) {
		var result = originalLoad.apply(cc.ig.gameMain, [data]);
		players.mapEnter();
		return result;
	};
});

var PlayerContainer = function () {
	function PlayerContainer() {
		_classCallCheck(this, PlayerContainer);

		this.players = {};
	}

	_createClass(PlayerContainer, [{
		key: 'update',
		value: function update() {}
	}, {
		key: 'setPlayer',
		value: function setPlayer(data, animContainer) {
			if (data.name === CONFIG.playerName || !simplify.getActiveMapName() || !cc.ig.playerInstance()) {
				return;
			}

			// generate if not existent
			var entity = this.players[data.name];
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

			var anim = data.anim[VAR_NAMES.anims][0];
			anim.sheet = animContainer.images[anim.sheet];
			if (anim.sheet) {
				_extends(entity[cc.ig.varNames.animation][VAR_NAMES.anims][0], data.anim[VAR_NAMES.anims][0]);
				delete data.anim[VAR_NAMES.anims];

				// if (data.anim[varNames.tint].length > 0){
				// 	Object.assign(entity[cc.ig.varNames.animation][varNames.tint][0].color, data.anim[varNames.tint][0].color);
				// 	delete data.anim[varNames.tint][0].color;
				//
				// 	Object.assign(entity[cc.ig.varNames.animation][varNames.tint][0], data.anim[varNames.tint][0]);
				// 	delete data.anim[varNames.tint];
				// }
				_extends(entity[cc.ig.varNames.animation], data.anim);
			}
			// data.pos.x += 80;
			Helper.setPos(entity, data.pos);
		}
	}, {
		key: 'generate',
		value: function generate() {
			return cc.ig.gameMain.spawnEntity('JumpPanel', -9000, 0, 0, {
				jumpHeight: '2',
				condition: 'false'
			});
			// return cc.ig.gameMain.spawnEntity('NPC', 0, 0, 20000, this.settings);
		}
	}, {
		key: 'generateAnalyzable',
		value: function generateAnalyzable(name) {
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
	}, {
		key: 'mapEnter',
		value: function mapEnter() {
			console.log('map enter');
			this.players = {};
		}
	}]);

	return PlayerContainer;
}();
function showMessage(message) {
	if(message) {
		new cc.ig.events.SHOW_SIDE_MSG({
			person : {
				person : "main.lea",
				expression : "DEFAULT"
			},
			message : {
				en_US : message
			}
		}).start()	
	}
	
}
var WebSocketClient = function () {
	function WebSocketClient(onmessage) {
		_classCallCheck(this, WebSocketClient);
		this.message = ""
		var _instance = this
		document.addEventListener("keypress", function() {
			if(String.fromCharCode(event.keyCode).toLowerCase() == 'm') {
				_instance.message = prompt("Enter a message");
				showMessage(window.playerName + ":" + _instance.message)
			}
		})
		this.onmessage = onmessage;
	}
	
	_createClass(WebSocketClient, [{
		key: 'connect',
		value: function connect(playerName, url, onopen, onerror) {
			var _this = this;
			window.playerName = CONFIG.playerName = playerName;

			this.updateInterval = 1;
			if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
				this.webSocket.close();
				this.webSocket = null;
			}

			this.webSocket = new WebSocket(url);

			this.webSocket.onmessage = function (event) {
				_this.onmessage(JSON.parse(event.data));
			};
			this.webSocket.onopen = function (event) {
				console.log("connection opened");
				_this.webSocket.send(JSON.stringify({
					message : playerName + " has connected"
				}))
				if (onopen) {
					onopen(event);
				}
			};
			this.webSocket.onerror = function (event) {
				console.log("Error!");
				console.log(event);
				if (onerror) {
					onerror(event);
				}
			};
		}
	}, {
		key: 'update',
		value: function update() {
			var player = cc.ig.playerInstance();
			var mapName = simplify.getActiveMapName();
			if (!player || !mapName || !this.webSocket) {
				return;
			}

			if (this.webSocket.readyState !== WebSocket.OPEN) {
				console.error('websocket not opened!');
				return;
			}

			var data = {
				map: mapName,
				name: CONFIG.playerName,
				pos: Helper.getPos(player)
			};
			if(this.message) {
				data['message'] = CONFIG.playerName + ":" + this.message
				this.message = ""
			}
			data.anim = _extends({}, player[cc.ig.varNames.animation]);
			var cpy = _extends({}, data.anim[VAR_NAMES.anims][0]);
			cpy.sheet = cpy.sheet[VAR_NAMES.image].path;
			data.anim[VAR_NAMES.anims] = [cpy];

			data.anim[VAR_NAMES.tint] = [];
			data.anim[VAR_NAMES.empty] = [];

			// data.currentAnim = player[cc.ig.varNames.currentAnimation];
			// data.animState = player[cc.ig.varNames.animationState];

			this.webSocket.send(JSON.stringify(data));
		}
	}]);

	return WebSocketClient;
}();

var AnimationContainer = function () {
	function AnimationContainer() {
		_classCallCheck(this, AnimationContainer);

		this.images = {};
		this.hasAll = false;
	}

	_createClass(AnimationContainer, [{
		key: 'update',
		value: function update() {
			if (this.hasAll) {
				return;
			}
			var player = cc.ig.playerInstance();
			if (!player) {
				return;
			}
			var sheet = player[cc.ig.varNames.animation][VAR_NAMES.anims][0].sheet;
			var sheetName = sheet[VAR_NAMES.image].path;
			if (!this.images[sheetName]) {
				this.images[sheetName] = sheet;
				console.log(sheetName);

				var size = 0,
				    key = void 0;
				for (key in this.images) {
					if (this.images.hasOwnProperty(key)) size++;
				}
				if (size >= 2) {
					this.hasAll = true;
				}
			}
		}
	}]);

	return AnimationContainer;
}();

var WebSocketServer = function () {
	function WebSocketServer() {
		_classCallCheck(this, WebSocketServer);
	}
	

	_createClass(WebSocketServer, [{
		key: 'setupUi',
		value: function setupUi() {
			var gui = require('nw.gui');
			var mainWin = gui.Window.get();
			var newWin = gui.Window.open('../assets/mods/multiplayer/webSocket.html', {
				width: 700,
				height: 500
			});

			// mainWin.on('close', () => {
			// 	gui.App.quit();
			// })
		}
	}, {
		key: 'startServer',
		value: function startServer(port) {
			var Server = require('../assets/mods/multiplayer/simplewebsocket.min.js');
			console.log(Server);
			console.log('start server');
			if (this.server) {
				this.server.close();
				this.server = null;
			}
			this.server = new Server({ port: port });
			this.server.on('connection', function (socket) {
				socket.on('data', function (data) {
					return console.log(data);
				});
			});
		}
	}]);

	return WebSocketServer;
}();

var Helper = function () {
	function Helper() {
		_classCallCheck(this, Helper);
	}

	_createClass(Helper, null, [{
		key: 'setPos',
		value: function setPos(entity, pos) {
			Helper.assign(entity[cc.ig.varNames.entityData][cc.ig.varNames.entityPosition], pos);
			if (entity.analyzableTest) {
				var otherPos = {
					x: pos.x,
					y: pos.y - 13,
					z: pos.z
				};
				Helper.assign(entity.analyzableTest[cc.ig.varNames.entityData][cc.ig.varNames.entityPosition], otherPos);
			}
		}
	}, {
		key: 'getPos',
		value: function getPos(entity) {
			return cc.ig.gameMain.getEntityPosition(entity);
		}
	}, {
		key: 'assign',
		value: function assign(a, b) {
			a = a || {};
			a.x = b.x;
			a.y = b.y;
			a.z = b.z;
			return a;
		}
	}, {
		key: 'nwjs',
		value: function nwjs() {
			var cc = frame.contentWindow.cc;
			var player = cc.ig.playerInstance();
			var anim = player.Xa;
		}
	}]);

	return Helper;
}();