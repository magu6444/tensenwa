// 各図形を管理する配列
let points = [];
let lines = [];
let waCircles = [];

// 最初に選択された「点」や「線」を一時的に保存する変数
let selectedPoint = null;
let selectedLine = null;

// 点の目標数
const targetPointCount = 25;

// サウンドファイルを格納する変数
let soundSmall, soundMedium, soundLarge;
let clickSounds = [];
let clickSoundIndex = 0;

// --- 音声ファイルのプリロード ---
function preload() {
  soundFormats('wav', 'mp3');
  // 「わ」の音声を指定
  soundSmall = loadSound('1wa.wav');
  soundMedium = loadSound('2wa.wav');
  soundLarge = loadSound('3wa.wav');

  // クリック音を読み込み、音量を設定
  let moku1 = loadSound('moku1.mp3');
  moku1.setVolume(0.2); // moku1の音量を20%に設定
  clickSounds.push(moku1);

  let moku2 = loadSound('moku2.mp3');
  moku2.setVolume(0.2); // moku2の音量を20%に設定
  clickSounds.push(moku2);
}


function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 最初に表示する「点」を生成
  for (let i = 0; i < targetPointCount; i++) {
    points.push(new Point());
  }
}

function draw() {
  background(255); // 白色の背景

  // --- 点の補充 ---
  // 画面上の点が目標数より少なければ、新しい点を1つ追加する
  if (points.length < targetPointCount) {
    points.push(new Point());
  }
  
  // --- 衝突判定 ---
  // 点同士の衝突
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      points[i].collideWithPoint(points[j]);
    }
  }

  // 各図形を描画・更新
  for (let p of points) {
    p.update(lines); // 線との衝突判定のためlinesを渡す
    p.display();
  }

  for (let l of lines) {
    l.update();
    l.display();
  }
  
  for (let c of waCircles) {
    c.update();
    c.display();
  }
  
  // アニメーションが完了して消滅した円を配列から削除する
  waCircles = waCircles.filter(c => c.isAlive);
}

// マウスクリック時とタッチ時の共通処理
function handleInteraction(x, y) {
  // ユーザーのインタラクションをきっかけにオーディオを開始する
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
  
  let somethingClicked = false;

  // --- 点のクリック判定 ---
  for (let i = points.length - 1; i >= 0; i--) {
    let p = points[i];
    if (p.isClicked(x, y) && p.isFloating) {
      playClickSound();
      // 点をクリックしたら、選択中の線を解除する
      if (selectedLine) {
        selectedLine.isSelected = false;
        selectedLine = null;
      }
      p.stop();
      if (selectedPoint === null) {
        selectedPoint = p;
      } else {
        lines.push(new Line(selectedPoint, p));
        points = points.filter(pt => pt !== selectedPoint && pt !== p);
        selectedPoint = null;
      }
      somethingClicked = true;
      break;
    }
  }

  if (somethingClicked) return; // 点がクリックされた場合はここで処理を終了

  // --- 線のクリック判定 ---
  for (let i = lines.length - 1; i >= 0; i--) {
    let l = lines[i];
    // アニメーションが完了した線のみクリック可能
    if (l.isComplete && l.isClicked(x, y)) {
      if (selectedLine === l) {
        // 同じ線を再度クリックした場合は選択解除
        playClickSound();
        l.isSelected = false;
        selectedLine = null;
      } else if (selectedLine === null) {
        // 1本目の線を選択
        playClickSound();
        l.isSelected = true;
        selectedLine = l;
      } else {
        // 2本目の線を選択し、円を生成
        playClickSound(); // ★★★ ここでクリック音を鳴らすように変更 ★★★
        waCircles.push(new WaCircle(selectedLine, l));
        lines = lines.filter(line => line !== selectedLine && line !== l);
        selectedLine = null;
      }
      somethingClicked = true;
      break;
    }
  }
  
  // --- 背景のクリック判定 ---
  if (!somethingClicked) {
    // 何か選択されていた場合のみ音を鳴らす
    if (selectedPoint || selectedLine) {
       playClickSound();
    }
    // 何も選択されていない場所をクリックしたら、選択をすべて解除
    if (selectedPoint) {
      selectedPoint.isSelected = false;
      selectedPoint = null;
    }
    if (selectedLine) {
      selectedLine.isSelected = false;
      selectedLine = null;
    }
  }
}

// マウスクリック時の処理
function mousePressed() {
  handleInteraction(mouseX, mouseY);
}

// タッチ開始時の処理（iPad等のタッチデバイス対応）
function touchStarted() {
  // タッチポイントがある場合、最初のタッチ座標を使用
  if (touches.length > 0) {
    handleInteraction(touches[0].x, touches[0].y);
  }
  // デフォルトのタッチ動作（スクロールなど）を防止
  return false;
}

// クリック音を交互に再生する関数
function playClickSound() {
  clickSounds[clickSoundIndex].play();
  clickSoundIndex = (clickSoundIndex + 1) % clickSounds.length; // 0と1を交互に切り替える
}

// 「点」のクラス
class Point {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.vx = random(-0.6, 0.6); // X方向の速度
    this.vy = random(-0.6, 0.6); // Y方向の速度
    this.radius = 5;
    this.isFloating = true;
    this.isSelected = false;
    this.fadeProgress = 0; // フェードインの進捗 (0 to 1)
  }

  // 動きの更新
  update(allLines) {
    if (this.isFloating) {
      // 線との衝突判定
      for (const line of allLines) {
        if (line.isComplete) {
          this.collideWithLine(line);
        }
      }

      this.x += this.vx;
      this.y += this.vy;
      // 画面の端に来たら反対側にワープ
      if (this.x < -this.radius) this.x = width + this.radius;
      if (this.x > width + this.radius) this.x = -this.radius;
      if (this.y < -this.radius) this.y = height + this.radius;
      if (this.y > height + this.radius) this.y = -this.radius;
    }
    // フェードイン進捗を更新
    this.fadeProgress = min(1, this.fadeProgress + 0.04);
  }

  // 表示
  display() {
    // easeOutCubic イージング関数を適用
    const ease = 1 - pow(1 - this.fadeProgress, 3);
    const alpha = 255 * ease;

    noStroke();
    // 透明度を適用
    fill(0, alpha);
    ellipse(this.x, this.y, this.radius * 2, this.radius * 2);
  }
  
  collideWithPoint(other) {
    if (!this.isFloating || !other.isFloating) return;

    let d = dist(this.x, this.y, other.x, other.y);
    let minDist = this.radius + other.radius;

    if (d < minDist) {
      // 位置の補正
      let overlap = minDist - d;
      let angle = atan2(this.y - other.y, this.x - other.x);
      let moveX = overlap * 0.5 * cos(angle);
      let moveY = overlap * 0.5 * sin(angle);
      this.x += moveX;
      this.y += moveY;
      other.x -= moveX;
      other.y -= moveY;

      // 速度の交換（完全弾性衝突）
      let v1 = createVector(this.vx, this.vy);
      let v2 = createVector(other.vx, other.vy);
      let pos1 = createVector(this.x, this.y);
      let pos2 = createVector(other.x, other.y);

      let vDiff = p5.Vector.sub(v1, v2);
      let posDiff = p5.Vector.sub(pos1, pos2);
      
      let newV1 = p5.Vector.sub(v1, p5.Vector.mult(posDiff, vDiff.dot(posDiff) / posDiff.magSq()));
      
      vDiff.mult(-1);
      posDiff.mult(-1);
      
      let newV2 = p5.Vector.sub(v2, p5.Vector.mult(posDiff, vDiff.dot(posDiff) / posDiff.magSq()));
      
      this.vx = newV1.x;
      this.vy = newV1.y;
      other.vx = newV2.x;
      other.vy = newV2.y;
    }
  }

  collideWithLine(line) {
    let d = distToSegment(this.x, this.y, line.p1.x, line.p1.y, line.p2.x, line.p2.y);
    if (d < this.radius) {
      // 位置の補正
      let lineVec = createVector(line.p2.x - line.p1.x, line.p2.y - line.p1.y);
      let pointVec = createVector(this.x - line.p1.x, this.y - line.p1.y);
      let t = constrain(pointVec.dot(lineVec) / lineVec.magSq(), 0, 1);
      let closestPoint = p5.Vector.add(createVector(line.p1.x, line.p1.y), p5.Vector.mult(lineVec, t));
      let overlapVec = p5.Vector.sub(createVector(this.x, this.y), closestPoint);
      if (overlapVec.mag() > 0) {
          let overlap = this.radius - overlapVec.mag();
          this.x += overlapVec.normalize().x * overlap;
          this.y += overlapVec.normalize().y * overlap;
      }

      // 速度の反射
      let normal = createVector(line.p2.y - line.p1.y, line.p1.x - line.p2.x).normalize();
      let velocity = createVector(this.vx, this.vy);
      let dotProduct = velocity.dot(normal);
      let reflection = p5.Vector.sub(velocity, p5.Vector.mult(normal, 2 * dotProduct));
      this.vx = reflection.x;
      this.vy = reflection.y;
    }
  }

  // 動きを止めて選択状態にする
  stop() {
    this.isFloating = false;
    this.isSelected = true;
  }

  // クリックされたか判定
  isClicked(mx, my) {
    // クリック判定エリアを少し広げる
    let d = dist(mx, my, this.x, this.y);
    return d < this.radius * 3;
  }
}

// 「線」のクラス
class Line {
  constructor(p1, p2) {
    this.p1 = { x: p1.x, y: p1.y };
    this.p2 = { x: p2.x, y: p2.y };
    this.progress = 0; // アニメーションの進捗 (0 to 1)
    this.isComplete = false; // アニメーションが完了したか
    this.isSelected = false; // 選択されているか
  }

  update() {
    if (!this.isComplete) {
      this.progress = min(1, this.progress + 0.015); // スピード調整
      if (this.progress >= 1) {
        this.isComplete = true;
      }
    }
  }

  display() {
    // easeInOutQuad イージング関数を適用
    const ease = this.progress < 0.5 ? 2 * this.progress * this.progress : 1 - pow(-2 * this.progress + 2, 2) / 2;
    
    // 線の本体を描画
    stroke(0);
    strokeWeight(2); // 太さを一定に
    const currentX = lerp(this.p1.x, this.p2.x, ease);
    const currentY = lerp(this.p1.y, this.p2.y, ease);
    line(this.p1.x, this.p1.y, currentX, currentY);
  }

  // 線がクリックされたか判定する
  isClicked(mx, my) {
    // 点と線分までの距離を計算
    const d = distToSegment(mx, my, this.p1.x, this.p1.y, this.p2.x, this.p2.y);
    // 距離が一定以下ならクリックされたとみなす
    return d < 10;
  }
}

// 「円」のクラス
class WaCircle {
  constructor(l1, l2) {
    const p1_ = createVector(l1.p1.x, l1.p1.y);
    const p2_ = createVector(l1.p2.x, l1.p2.y);
    const p3_ = createVector(l2.p1.x, l2.p1.y);
    const p4_ = createVector(l2.p2.x, l2.p2.y);

    const d13_24 = p1_.dist(p3_) + p2_.dist(p4_);
    const d14_23 = p1_.dist(p4_) + p2_.dist(p3_);
    
    // アニメーションの開始アンカーポイント
    this.anchors_start = [];
    if (d13_24 < d14_23) {
      this.anchors_start = [p1_, p3_, p2_, p4_];
    } else {
      this.anchors_start = [p1_, p4_, p2_, p3_];
    }

    // 最終的な円の中心と半径
    this.center = createVector((p1_.x + p2_.x + p3_.x + p4_.x) / 4, (p1_.y + p2_.y + p3_.y + p4_.y) / 4);
    
    // 2本の線の合計長から円の半径を計算
    const len1 = p1_.dist(p2_);
    const len2 = p3_.dist(p4_);
    this.radius = (len1 + len2) / (2 * PI);

    // ベジェ曲線で円を近似するためのマジックナンバー
    const k = 0.5522847498;
    const handleLen = this.radius * k;

    // 最終的な円のアンカーポイントと制御点
    this.anchors_end = [
      createVector(this.center.x, this.center.y - this.radius), // Top
      createVector(this.center.x + this.radius, this.center.y), // Right
      createVector(this.center.x, this.center.y + this.radius), // Bottom
      createVector(this.center.x - this.radius, this.center.y)  // Left
    ];
    this.controls_end = [
      createVector(this.center.x + handleLen, this.center.y - this.radius),
      createVector(this.center.x + this.radius, this.center.y - handleLen),
      createVector(this.center.x + this.radius, this.center.y + handleLen),
      createVector(this.center.x + handleLen, this.center.y + this.radius),
      createVector(this.center.x - handleLen, this.center.y + this.radius),
      createVector(this.center.x - this.radius, this.center.y + handleLen),
      createVector(this.center.x - this.radius, this.center.y - handleLen),
      createVector(this.center.x - handleLen, this.center.y - this.radius)
    ];

    // アニメーションの状態管理
    this.state = 'forming'; // forming -> holding -> fading
    this.formProgress = 0;
    this.fadeProgress = 0;
    this.isAlive = true;
    this.holdTimer = 0;
    this.holdDuration = 60; // 60フレーム（約1秒）の間表示をキープ
  }
  
  update() {
    if (this.state === 'forming') {
      this.formProgress = min(1, this.formProgress + 0.01); // スピード調整
      if (this.formProgress >= 1) {
        this.state = 'holding';
        
        // ★★★ 円の大きさに応じてサウンドを再生 ★★★
        if (this.radius < 60) {
          soundSmall.play();
        } else if (this.radius < 120) {
          soundMedium.play();
        } else {
          soundLarge.play();
        }
      }
    } else if (this.state === 'holding') {
      this.holdTimer++;
      if (this.holdTimer > this.holdDuration) {
        this.state = 'fading';
      }
    } else if (this.state === 'fading') {
      this.fadeProgress = min(1, this.fadeProgress + 0.015);
      if (this.fadeProgress >= 1) {
        this.isAlive = false;
      }
    }
  }
  
  display() {
    let alpha = 255;
    
    // --- 円の描画 ---
    // forming イージング
    const formEase = this.formProgress < 0.5 ? 2 * this.formProgress * this.formProgress : 1 - pow(-2 * this.formProgress + 2, 2) / 2;
    
    // fading イージング
    if (this.state === 'fading') {
      const fadeEase = this.fadeProgress * this.fadeProgress; // easeInQuad
      alpha = 255 * (1 - fadeEase);
    }

    noFill();
    strokeWeight(3);
    stroke(0, alpha);

    // 現在のアンカーポイントを計算
    const current_anchors = [];
    for(let i=0; i<4; i++){
      current_anchors.push(p5.Vector.lerp(this.anchors_start[i], this.anchors_end[i], formEase));
    }

    // 開始時の制御点はアンカーポイントと同じ（＝直線）
    const controls_start = [
      this.anchors_start[0], this.anchors_start[1], this.anchors_start[1], this.anchors_start[2],
      this.anchors_start[2], this.anchors_start[3], this.anchors_start[3], this.anchors_start[0]
    ];

    // 現在の制御点を計算
    const current_controls = [];
    for(let i=0; i<8; i++){
      current_controls.push(p5.Vector.lerp(controls_start[i], this.controls_end[i], formEase));
    }
    
    // 4つのベジェ曲線で滑らかな図形を描画
    beginShape();
    vertex(current_anchors[0].x, current_anchors[0].y);
    for (let i = 0; i < 4; i++) {
      const next_i = (i + 1) % 4;
      bezierVertex(
        current_controls[i*2].x, current_controls[i*2].y,
        current_controls[i*2+1].x, current_controls[i*2+1].y,
        current_anchors[next_i].x, current_anchors[next_i].y
      );
    }
    endShape();

    // --- 「わ」の文字を描画 ---
    if (this.formProgress >= 1) {
      let textAlpha = 0;
      const finalSize = this.radius * 0.9;
      let currentSize = 0;

      if (this.state === 'holding') {
        const popProgress = min(1, this.holdTimer / (this.holdDuration / 2));
        // easeOutCubic イージング
        const popEase = 1 - pow(1 - popProgress, 3);
        textAlpha = 255 * popEase;
        currentSize = finalSize * popEase;
      } else if (this.state === 'fading') {
        textAlpha = alpha;
        currentSize = finalSize;
      }
      
      fill(0, textAlpha);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(currentSize); // 円の大きさに応じた文字サイズ
      text('わ', this.center.x, this.center.y);
    }
  }
}

// 点(px, py)と線分(x1, y1)-(x2, y2)との最短距離を計算するヘルパー関数
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = dist(x1, y1, x2, y2) ** 2;
  if (l2 === 0) return dist(px, py, x1, y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
}

