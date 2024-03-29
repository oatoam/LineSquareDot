const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

/**
 * TODO:
 * 1. randomly move lines' two endpoint
 * 2. line spin at its middle point
 * 3. line moves follow its direction
 * 4. line moves follow its direction and reflect when touch border
 */

const scale = window.devicePixelRatio || 1;
const BASE_SPEED_FACTOR = (detectMobile() ? 3 : 2);

const LINE_WIDTH = Math.min(screen.width, screen.height) / (detectMobile() ? 100 : 640);
const DOT_SIZE = LINE_WIDTH;
const BOX_SIZE = DOT_SIZE * 10;

const BOX_RESERVED_SPACE = 0.1;
const LINE_RESERVED_SPACE = 0.05;
const SCENE_BORDER = true;
const DISABLE_LINE_MOVE = false;
const INTERVAL_LINE_MOVE = 2000;
const LINE_MOVE_TYPE = '';

let paused = false;

const TIPS = detectMobile() ?
    `Double Tap for reset`:
    `ESC for reset,\nSpace for pause`;

function detectMobile() {
  const toMatch = [
      /Android/i,
      /webOS/i,
      /iPhone/i,
      /iPad/i,
      /iPod/i,
      /BlackBerry/i,
      /Windows Phone/i
  ];
  
  return toMatch.some((toMatchItem) => {
      return navigator.userAgent.match(toMatchItem);
  });
}

class PresetLine {
  constructor(middlePoint, angle, length) {
    this.middlePoint = middlePoint;
    this.angle = angle;
    this.length = length;
    this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0;
    this.reCalculate();
  }

  reCalculate() {
    this.x1 = this.middlePoint.x - this.length * Math.sin(this.angle) / 2;
    this.y1 = this.middlePoint.y - this.length * Math.cos(this.angle) / 2;
    this.x2 = this.middlePoint.x + this.length * Math.sin(this.angle) / 2;
    this.y2 = this.middlePoint.y + this.length * Math.cos(this.angle) / 2;
  }

  rotate(angleDelta) {
    this.angle += angleDelta;
    while (this.angle > Math.PI * 2) {
      this.angle -= Math.PI * 2;
    }
    this.reCalculate();
  }
}

PresetLine.random = function() {
  let middlePoint = {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
  };
  let length = Math.min(canvas.width, canvas.height) * (Math.random() * 0.6 + 0.2);
  let angle = Math.random() * Math.PI * 2; // 随机角度 from 0 to 360 degrees (in radians)
  return new PresetLine(middlePoint, angle, length);
}

class Velocity {
  constructor(angle, factor) {
    this.x = Math.sin(angle);
    this.y = Math.cos(angle);
    this.factor = 1;
    if (factor) {
      this.setFactor(factor);
    }
  }

  updateFactor(delta) {
    this.setFactor(this.factor + delta);
    return this.factor;
  }

  setFactor(factor) {
    if (factor == null || factor == undefined || typeof factor !== 'number') {
      this.factor = 1;
    } else if (factor < 1) {
      this.factor = 1;
    } else {
      this.factor = factor;
    }
    return this.factor;
  }

  get realVX() {
    return this.x * this.factor * BASE_SPEED_FACTOR;
  }
  get realVY() {
    return this.y * this.factor * BASE_SPEED_FACTOR;
  }
}

Velocity.random = function () {
  return new Velocity(2 * Math.PI * Math.random(), 2);
}

let gameState = {
  level: parseInt(localStorage.getItem('level') || '0'),
  playerDot: { x: canvas.width / 2, y: 0 },
  playerSpeed: Velocity.random(),
  targetBox: randomBox(),
  lines: [],
  userLines: [],
  borders: [],
  userColor: '',
  usedColors: new Set(),
};

function incrementLevel() {
  updateGameState(+1);
}

function decrementLevel() {
  updateGameState(-1);
}

function setupCanvas() {
  canvas.width = Math.floor(document.body.clientWidth)-1;
  canvas.height = Math.floor(document.body.clientHeight)-1;
  canvas.width *= scale;
  canvas.height *= scale;
  ctx.translate(scale, scale);
  updateGameState(0);
}

window.addEventListener('resize', setupCanvas);
setupCanvas();

let isCurrentLineDrawing = false;
let currentLine = { x1: 0, y1: 0, x2: 0, y2: 0 };

function updateGameState(levelDelta) {
  pause();

  if (levelDelta == -1 || levelDelta == 1) {
    gameState.level += levelDelta;
  }
  if (gameState.level < 0) {
    gameState.level = 0;
  }

  localStorage.setItem('level', gameState.level.toString());

  gameState.playerDot = { x: canvas.width / 2, y: canvas.height / 2 };
  gameState.playerSpeed = Velocity.random();
  gameState.targetBox = randomBox();
  gameState.lines = [];

  gameState.borders= [];
  if (detectMobile() || SCENE_BORDER) {
    gameState.borders.push({ x1: 0, y1: 0, x2: canvas.width, y2: 0 });
    gameState.borders.push({ x1: 0, y1: 0, x2: 0, y2: canvas.height });
    gameState.borders.push({ x1: canvas.width, y1: 0, x2: canvas.width, y2: canvas.height });
    gameState.borders.push({ x1: 0, y1: canvas.height, x2: canvas.width, y2: canvas.height });
  }

  for (let i = 0; i < gameState.level; i++) {
    gameState.lines.push(randomLine());
  }
  gameState.userLines = [];
  gameState.usedColors.clear();
  gameState.userColor = morandiColor();


  setTimeout(() => {
    resume();
  }, 200);
}

function randomBox() {
  let size = BOX_SIZE * scale; // 随机框的大小
  return {
    x: (Math.random()*(1-2*BOX_RESERVED_SPACE) + BOX_RESERVED_SPACE) * (canvas.width - size),
    y: (Math.random()*(1-2*BOX_RESERVED_SPACE) + BOX_RESERVED_SPACE) * (canvas.height - size),
    width: size,
    height: size
  };
}


function randomLine() {

  return PresetLine.random();
  if (0) {

    let x1 = Math.random() * canvas.width;
    let y1 = Math.random() * canvas.height;
    let lineLength = Math.random() * 0.6 + 0.2; // 线条长度在20到120像素之间
    lineLength *= Math.min(canvas.width, canvas.height);
    let angle = Math.random() * Math.PI * 2; // 随机角度 from 0 to 360 degrees (in radians)

    // 通过极坐标系统计算结束坐标点
    let x2 = x1 + lineLength * Math.cos(angle);
    let y2 = y1 + lineLength * Math.sin(angle);

    // // 限制线条的结束点不能超出canvas
    // if (x2 < 0) x2 = 0;
    // if (y2 < 0) y2 = 0;
    // if (x2 > canvas.width) x2 = canvas.width;
    // if (y2 > canvas.height) y2 = canvas.height;

    return { x1, y1, x2, y2 };

  }

}

// point { x, y }
// line { x1, y1, x2, y2 }
function pointToLineDistance(x, y, x1, y1, x2, y2) {
  let A = x - x1;
  let B = y - y1;
  let C = x2 - x1;
  let D = y2 - y1;

  let dot = A * C + B * D;
  let len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) {
    param = dot / len_sq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  let dx = x - xx;
  let dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// 计算点积
function dotProduct(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y;
}

// 计算投影长度
function projectionLength(realVelocity, normal) {
  let n = normalize(normal); // 确保法线向量是单位向量
  let projectionLength = dotProduct(realVelocity, n); // 在法线方向上的投影长度
  return Math.abs(projectionLength); // 返回投影长度的绝对值
}

function velocityProjection(realVelocity, normal) {
  let n = normalize(normal); // 确保法线向量是单位向量
  let projectionLength = dotProduct(realVelocity, n); // 在法线方向上的投影长度
  return projectionLength; // 返回投影长度的绝对值
}

// point { x, y }
// line { x1, y1, x2, y2 }
function isCollisionWithVelocity(point, line, realVelocity) {
  const distance = pointToLineDistance(point.x, point.y, line.x1, line.y1, line.x2, line.y2);
  const lineDirection = { x: line.x2 - line.x1, y: line.y2 - line.y1 }; // 线的方向向量
  let normal = { x: -lineDirection.y, y: lineDirection.x }; // 线的法向量
  const projLength = projectionLength(realVelocity, normal); // 点速度在法线方向的投影长度

  return distance <= projLength;
}

// 标准化向量
function normalize(vector) {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  return {
    x: vector.x / length,
    y: vector.y / length
  };
}

// 计算点的新速度（反射）
function reflect(velocity, normal) {
  // 确保法线是单位向量
  let n = normalize(normal);

  // 计算 v·n
  let dot = velocity.x * n.x + velocity.y * n.y;

  // 计算反射向量
  return {
    x: velocity.x - 2 * dot * n.x,
    y: velocity.y - 2 * dot * n.y
  };
}

// 需要找到线段的法线向量
function lineNormal(x1, y1, x2, y2) {
  // 计算线段的方向向量
  let dx = x2 - x1;
  let dy = y2 - y1;

  // 根据方向向量得到法线向量（垂直方向）
  return { x: -dy, y: dx };
}

function morandiColor() {
  // 莫兰迪色调通常具有较低的饱和度
  let saturation = Math.random() * 0.5 + 0.3; // 30%-50% 饱和度
  let value = Math.random() * 0.2 + 0.6; // 60%-80% 亮度
  let hue = Math.random() * 360; // 0-360 色相

  function hsvToRgb(h, s, v) {
    let r, g, b;

    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }

    function toHex(value) {
      let hex = Math.floor(value * 255).toString(16);
      return hex.length == 1 ? "0" + hex : hex;
    }

    // 将RGB值转换为16进制
    return "#" + toHex(r) + toHex(g) + toHex(b);
  }

  let newColor = hsvToRgb(hue, saturation, value);
  if (gameState.usedColors.has(newColor)) {
    return morandiColor();
  }
  gameState.usedColors.add(newColor);
  return newColor;
}



function draw() {
  ctx.clearRect(-10, -10, canvas.width+10, canvas.height+10);
  ctx.lineWidth = LINE_WIDTH;

  // 绘制背景等级/提示
  {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e0e0e0e0';

    function calcFontSize(text) {
      return Math.min(540, Math.min(canvas.width,canvas.height) / text.length);
    }

    let text = gameState.level.toString();
    ctx.font = `${ calcFontSize(text)}px Seirf`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e0e0e0e0';
    let x = canvas.width / 2;
    let y = canvas.height / 2;
    ctx.fillText(text, x, y);

    let tip = TIPS;
    let tipfontsize = Math.min(canvas.width,canvas.height) / tip.length;
    ctx.font = `${tipfontsize}px Seirf`;
    ctx.fillText(tip, x, tipfontsize);
  }


  // 绘制点
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(gameState.playerDot.x, gameState.playerDot.y, DOT_SIZE * scale, 0, Math.PI * 2);
  ctx.fill();

  // 绘制框
  ctx.strokeStyle = gameState.userColor;
  ctx.strokeRect(gameState.targetBox.x, gameState.targetBox.y, gameState.targetBox.width, gameState.targetBox.height);
  ctx.stroke();

  function drawLine(line) {
    if (line.color == undefined || line.color == null) {
      line.color = morandiColor();
    }
    ctx.strokeStyle = `${line.color}`;
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
    ctx.strokeStyle = '';
  }

  // 在新的级别中绘制一条线
  gameState.lines.forEach(drawLine);
  // 绘制用户线
  gameState.userLines.forEach(drawLine);

  // 绘制当前用户正在绘制的线，它在用户鼠标拖动时会动态变化
  if (isCurrentLineDrawing) {
    ctx.setLineDash([16,8]);
    drawLine(currentLine);
    ctx.setLineDash([]);
  }

}



function renderLoop() {
  // if (paused) return;
  // draw();
  // requestAnimationFrame(renderLoop);
}

function gameLoop() {
  if (paused) return;

  const normalizeVelocity = {
    x: gameState.playerSpeed.x,
    y: gameState.playerSpeed.y,
  }
  const realVelocity = {
    x: gameState.playerSpeed.realVX,
    y: gameState.playerSpeed.realVY,
  }

  // 更新点的位置
  let currentDot = {
    x: gameState.playerDot.x,
    y: gameState.playerDot.y,
  };
  let nextDot = {
    x: currentDot.x + realVelocity.x,
    y: currentDot.y + realVelocity.y,
  }
  let predictNextNextDot = {
    x: nextDot.x + realVelocity.x,
    y: nextDot.y + realVelocity.y,
  }


  // console.log(`playerDot ${gameState.playerDot.x} ${gameState.playerDot.y}`)

    // 简单的边界检查
    if (
      gameState.playerDot.x < 0 ||
      gameState.playerDot.y < 0 ||
      gameState.playerDot.x > canvas.width ||
      gameState.playerDot.y > canvas.height
    ) {
      decrementLevel(); // 出界则等级减一
      draw();
      requestAnimationFrame(gameLoop);
      return;
    }

  // 简单的点是否进入框的检查
  if (
    nextDot.x > gameState.targetBox.x &&
    nextDot.x < gameState.targetBox.x + gameState.targetBox.width &&
    nextDot.y > gameState.targetBox.y &&
    nextDot.y < gameState.targetBox.y + gameState.targetBox.height
  ) {
    incrementLevel(); // 如果点进入框，则等级加一
    draw();
    requestAnimationFrame(gameLoop);
    return;
  }

  // 检查是否打在用户线上并处理反弹
  // ...
  // 碰撞检测和反弹逻辑
  let reflected = false;

  let checkReflect = function (line) {
    if (reflected) { return; }
    if (line.disabled) {
      line.disabled = false;
    }
    if (isCollisionWithVelocity(nextDot, line, realVelocity)) { //  || isCollisionWithVelocity(predictNextNextDot, line, velocity)
      // Calculate the line's normal
      let normal = lineNormal(line.x1, line.y1, line.x2, line.y2);
      // Reflect the dot's velocity
      let newVelocity = reflect(normalizeVelocity, normal);  // 假设点只有垂直方向的速度，在实际情况下，需要根据实际情况计算
      // Update playerDot's velocity
      normalizeVelocity.x = newVelocity.x;
      normalizeVelocity.y = newVelocity.y;
      reflected = true;
      line.disabled = true;
      // console.log(`${JSON.stringify(currentDot)} reflect with line ${JSON.stringify(line)}`);
    }
  }

  gameState.userLines.forEach(checkReflect);
  gameState.lines.forEach(checkReflect);
  gameState.borders.forEach(checkReflect);

  if (reflected) {
    gameState.playerDot.x = currentDot.x;
    gameState.playerDot.y = currentDot.y;
  } else {
    gameState.playerDot.x = nextDot.x;
    gameState.playerDot.y = nextDot.y;
  }

  gameState.playerSpeed.x = normalizeVelocity.x;
  gameState.playerSpeed.y = normalizeVelocity.y;

  // setTimeout(gameLoop, 10);


  draw();
  requestAnimationFrame(gameLoop);
}

function drawCurrentLine(line) {
  // 清除上一次移动时绘制的线
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 如果需要的话重绘画布上的其他已经绘制的元素
  draw();

  // 绘制当前用户正在绘制的线，它在用户鼠标拖动时会动态变化
  ctx.beginPath();
  ctx.moveTo(line.x1, line.y1);
  ctx.lineTo(line.x2, line.y2);
  ctx.stroke();
}

let mouseDown = false;

canvas.addEventListener('mousedown', function (e) {
  mouseDown = true;
  isCurrentLineDrawing = false;
  currentLine.color = null;
  currentLine.x1 = e.offsetX * scale;
  currentLine.y1 = e.offsetY * scale;
});



canvas.addEventListener('mousemove', function (e) {
  if (mouseDown) {
    currentLine.x2 = e.offsetX * scale;
    currentLine.y2 = e.offsetY * scale;
    isCurrentLineDrawing = true;
    draw();
  }
});

if (INTERVAL_LINE_MOVE > 0) {
  function intervalLineMove() {
    moveLinesRandomly();
    setTimeout(intervalLineMove, INTERVAL_LINE_MOVE);
  }
  intervalLineMove();
}

function moveLinesRandomly() {
  if (DISABLE_LINE_MOVE) { return; }
  if (paused) { return; }

  gameState.lines.forEach((line)=> {
    line.rotate(Math.PI / 6 * Math.random());
  })
  if (gameState.userLines.length % 3 == 2) {
    switch (LINE_MOVE_TYPE) {
      case "dou":
        gameState.lines.forEach((line) => {
          line.x1 += (Math.random() - 0.5) * 2 * BOX_SIZE;
          line.y1 += (Math.random() - 0.5) * 2 * BOX_SIZE;
          line.x2 += (Math.random() - 0.5) * 2 * BOX_SIZE;
          line.y2 += (Math.random() - 0.5) * 2 * BOX_SIZE;
        })
        break;
      case "spin":
        gameState.lines.forEach((line)=> {
          line.rotate(Math.PI / 6 * Math.random());
        })
    }

  }
}

canvas.addEventListener('mouseup', function (e) {
  if (mouseDown) {
    mouseDown = false;
    currentLine.x2 = e.offsetX * scale;
    currentLine.y2 = e.offsetY * scale;
    // 结束绘制，将线添加到游戏状态中
    gameState.userLines.push({ ...currentLine });
    moveLinesRandomly();
    // 重绘整个画面以包含新线条
    draw();
  }
  isCurrentLineDrawing = false;
});

canvas.addEventListener('touchstart', function (e) {
  console.log(e);
  mouseDown = true;
  isCurrentLineDrawing = false;
  currentLine.color = null;
  currentLine.x1 = e.changedTouches[0].clientX * scale;
  currentLine.y1 = e.changedTouches[0].clientY * scale;
});

canvas.addEventListener('touchmove', function (e) {
  console.log(e);
  if (mouseDown) {
    currentLine.x2 = e.changedTouches[0].clientX * scale;
    currentLine.y2 = e.changedTouches[0].clientY * scale;
    isCurrentLineDrawing = true;
    draw();
  }
});

canvas.addEventListener('touchend', function (e) {
  console.log(e);
  if (mouseDown) {
    mouseDown = false;
    currentLine.x2 = e.changedTouches[0].clientX * scale;
    currentLine.y2 = e.changedTouches[0].clientY * scale;
    // 结束绘制，将线添加到游戏状态中
    gameState.userLines.push({ ...currentLine });
    moveLinesRandomly();

    // 重绘整个画面以包含新线条
    draw();
  }
  isCurrentLineDrawing = false;
});

function pause() {
  paused = true;
}

function resume() {
  paused = false;
  gameLoop();
}

window.addEventListener('keydown', ev => {
  if (ev.code === "Space") {
    if (paused) {
      resume();
      document.getElementById("control").hidden = true;
    } else {
      pause();
      document.getElementById("control").hidden = false;
    }
  } else if (ev.code === "Escape") {
    decrementLevel();
    document.getElementById("control").hidden = true;
  }
})


// double tap detect
lastTapTimeStamp = 0;
window.addEventListener('touchend', ev => {
  let currentTime = ev.timeStamp;
  if (lastTapTimeStamp) {
    let deltaFromLastTap = currentTime - lastTapTimeStamp;
    if (deltaFromLastTap < 200 && deltaFromLastTap > 0) {
      lastTapTimeStamp = 0;
      decrementLevel();
      return;
    }
  }

  lastTapTimeStamp = currentTime;
});

document.getElementById("level-incrment").addEventListener('click', incrementLevel);
document.getElementById("level-decrment").addEventListener('click', decrementLevel);
document.getElementById("speed-single").addEventListener('click', () => {
  gameState.playerSpeed.setFactor(1);
});
document.getElementById("speed-double").addEventListener('click', () => {
  gameState.playerSpeed.setFactor(2);
});
document.getElementById("speed-trible").addEventListener('click', () => {
  gameState.playerSpeed.setFactor(3);
});

// 启动游戏循环
gameLoop();
renderLoop();