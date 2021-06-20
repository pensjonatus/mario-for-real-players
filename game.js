kaboom({
  global: true,
  fullscreen: true,
  scale: 2,
  debug: true,
  clearColor: [0, 0, 0, 1],
});

const MOVE_SPEED = 120;
const JUMP_FORCE = 400;
const BIG_JUMP_FORCE = 550;
let CURRENT_JUMP_FORCE = JUMP_FORCE;
let isJumping = true;
const FALL_DEATH = 400;

loadSprite("mario", "./img/mario.png", {
  sliceX: 7,
  sliceY: 1,
  anims: {
    run: {
      from: 2,
      to: 4,
    },
    jump: {
      from: 6,
      to: 6,
    },
    idle: {
      from: 0,
      to: 0,
    },
    die: {
      from: 1,
      to: 1,
    },
  },
});

loadSprite("goomba", "./img/goomba.png");
loadSprite("brick", "./img/brick.png");
loadSprite("ground", "./img/ground.png");

loadSprite("coin", "./img/coin.png");
loadSprite("mushroom", "./img/mushroom.png");

loadSprite("surprise", "./img/surprise.png");
loadSprite("surprise-empty", "./img/surprise-empty.png");

loadSprite("pipe-top-left", "./img/pipe-top-left.png");
loadSprite("pipe-top-right", "./img/pipe-top-right.png");
loadSprite("pipe-bottom-left", "./img/pipe-bottom-left.png");
loadSprite("pipe-bottom-right", "./img/pipe-bottom-right.png");

loadSprite("blue-ground", "./img/blue-ground.png");
loadSprite("blue-brick", "./img/blue-brick.png");
loadSprite("blue-steel", "./img/blue-steel.png");
loadSprite("blue-goomba", "./img/blue-goomba.png");
loadSprite("blue-surprise", "./img/blue-surprise.png");

loadSound("jump-sfx", "./sounds/jump.wav");
loadSound("smush-sfx", "./sounds/smush.wav");
loadSound("coin-sfx", "./sounds/coin.wav");
loadSound("heal-sfx", "./sounds/heal.wav");

scene("game", ({ level, score }) => {
  layers(["bg", "obj", "ui"], "obj");

  const maps = [
    [
      "                                                                                     ",
      "                                                                                     ",
      "                                                                                     ",
      "                                                                                     ",
      "                                                                                     ",
      "     %   =*=%=                                                                       ",
      "                                                                                     ",
      "                            -+                                                       ",
      "                    ^   ^   ()                                                       ",
      "==============================   ====================================================",
    ],
    [
      "£                                       £",
      "£                                       £",
      "£                                       £",
      "£                                       £",
      "£                                       £",
      "£        @@@@@@              x x        £",
      "£                          x x x        £",
      "£                        x x x x  x   -+£",
      "£               z   z  x x x x x  x   ()£",
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
    ],
  ];

  const levelCfg = {
    width: 20,
    height: 20,
    "=": [sprite("ground"), solid()],
    $: [sprite("coin"), "coin"],
    "%": [sprite("surprise"), solid(), "coin-surprise"],
    "*": [sprite("surprise"), solid(), "mushroom-surprise"],
    "}": [sprite("surprise-empty"), solid()],
    "(": [sprite("pipe-bottom-left"), solid(), scale(0.5)],
    ")": [sprite("pipe-bottom-right"), solid(), scale(0.5)],
    "-": [sprite("pipe-top-left"), solid(), scale(0.5), "pipe"],
    "+": [sprite("pipe-top-right"), solid(), scale(0.5), "pipe"],
    "^": [sprite("goomba"), solid(), scale(1), "dangerous", body()],
    "#": [sprite("mushroom"), solid(), "mushroom", body()],
    "!": [sprite("blue-ground"), solid(), scale(0.5)],
    "£": [sprite("blue-brick"), solid(), scale(0.5)],
    z: [sprite("blue-goomba"), solid(), scale(0.5), "dangerous", body()],
    "@": [sprite("blue-surprise"), solid(), scale(0.5), "coin-surprise"],
    x: [sprite("blue-steel"), solid(), scale(0.5)],
  };

  const gameLevel = addLevel(maps[level], levelCfg);

  const scoreLabel = add([
    text(score),
    pos(30, 6),
    layer("ui"),
    {
      value: score,
    },
  ]);

  add([text("level " + parseInt(level + 1)), pos(40, 6)]);

  function big() {
    let timer = 0;
    let isBig = false;
    return {
      update() {
        if (isBig) {
          CURRENT_JUMP_FORCE = BIG_JUMP_FORCE;
          timer -= dt();
          if (timer <= 0) {
            this.smallify();
          }
        }
      },
      isBig() {
        return isBig;
      },
      smallify() {
        this.scale = vec2(1);
        CURRENT_JUMP_FORCE = JUMP_FORCE;
        timer = 0;
        isBig = false;
      },
      biggify(time) {
        this.scale = vec2(2);
        timer = time;
        isBig = true;
      },
    };
  }

  const player = add([
    sprite("mario"),
    solid(),
    pos(30, 0),
    scale(1),
    body(),
    big(),
    origin("bot"),
  ]);

  action("mushroom", (m) => {
    m.move(30, 0);
  });

  player.on("headbump", (obj) => {
    if (obj.is("coin-surprise")) {
      play("coin-sfx");
      gameLevel.spawn("$", obj.gridPos.sub(0, 1));
      destroy(obj);
      gameLevel.spawn("}", obj.gridPos.sub(0, 0));
    }
    if (obj.is("mushroom-surprise")) {
      play("heal-sfx");
      gameLevel.spawn("#", obj.gridPos.sub(0, 1));
      destroy(obj);
      gameLevel.spawn("}", obj.gridPos.sub(0, 0));
    }
  });

  player.on("grounded", () => {
    player.play("idle");
  });

  player.collides("mushroom", (m) => {
    destroy(m);
    player.biggify(6);
  });

  player.collides("coin", (c) => {
    destroy(c);
    scoreLabel.value++;
    scoreLabel.text = scoreLabel.value;
  });

  const ENEMY_SPEED = 20;

  action("dangerous", (d) => {
    d.move(-ENEMY_SPEED, 0);
  });

  player.collides("dangerous", (d) => {
    if (isJumping) {
      d.stop();
      d.rmTag("dangerous");
      play("smush-sfx");
      d.scale = vec2(1, -0.2);
      wait(1, () => {
        destroy(d);
      });
    } else {
      const currentPos = player.pos;
      camPos(currentPos);
      player.play("die");
      player.jump(CURRENT_JUMP_FORCE);
      wait(1, () => {
        go("lose", { score: scoreLabel.value });
      });
    }
  });

  player.action(() => {
    camPos(player.pos);
    if (player.pos.y >= FALL_DEATH) {
      go("lose", { score: scoreLabel.value });
    }
  });

  player.action(() => {
    if (player.grounded()) {
      isJumping = false;
    }
  });

  player.collides("pipe", () => {
    keyPress("down", () => {
      go("game", {
        level: (level + 1) % maps.length,
        score: scoreLabel.value,
      });
    });
  });

  keyDown(["left", "right"], () => {
    if (player.grounded() && player.curAnim() !== "run") {
      player.play("run");
    }
  });

  keyRelease(["left", "right"], () => {
    if (!keyIsDown("right") && !keyIsDown("left")) {
      player.play("idle");
    }
  });

  keyDown("left", () => {
    player.flipX(-1);
    player.move(-MOVE_SPEED, 0);
  });

  keyDown("right", () => {
    player.flipX(1);
    player.move(MOVE_SPEED, 0);
  });

  keyPress("space", () => {
    if (player.grounded()) {
      isJumping = true;
      play("jump-sfx", { volume: 0.4 });
      player.play("jump");
      player.jump(CURRENT_JUMP_FORCE);
    }
  });
});

scene("lose", ({ score }) => {
  add([
    text("You DIED", 62),
    origin("center"),
    pos(width() / 2, height() / 2 - 70),
  ]);
  add([
    text(`Your score was: ${score}`, 32),
    origin("center"),
    pos(width() / 2, height() / 2),
  ]);
});

start("game", { level: 0, score: 0 });
