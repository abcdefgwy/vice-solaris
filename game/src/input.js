// 统一键盘与鼠标输入管理器：移动、冲刺、手刹漂移、抢车、武器 1-4 切换、瞄准射击、静音与暂停

export function createInput(canvas, audio) {
  const keys = new Set();
  const oneshot = {
    enterVehicle: false,
    pause: false,
    confirm: false,
    mute: false,
    melee: false,
    weaponSlot: -1,
  };

  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let hasMouseMoved = false;

  function onKeyDown(e) {
    if (audio) audio.unlock();
    const code = e.code;

    if (!e.repeat) {
      if (code === 'KeyE' || code === 'KeyF') oneshot.enterVehicle = true;
      if (code === 'KeyP' || code === 'Escape') oneshot.pause = true;
      if (code === 'Enter' || code === 'Space') oneshot.confirm = true;
      if (code === 'KeyM') oneshot.mute = true;
      if (code === 'KeyQ' || code === 'KeyV') oneshot.melee = true;
      if (code === 'Digit1') oneshot.weaponSlot = 0;
      if (code === 'Digit2') oneshot.weaponSlot = 1;
      if (code === 'Digit3') oneshot.weaponSlot = 2;
      if (code === 'Digit4') oneshot.weaponSlot = 3;
    }

    keys.add(code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    hasMouseMoved = true;
  }

  function onMouseDown(e) {
    if (audio) audio.unlock();
    if (e.button === 0) {
      mouseDown = true;
      oneshot.confirm = true;
    } else if (e.button === 2) {
      oneshot.melee = true;
    }
  }

  function onMouseUp(e) {
    if (e.button === 0) mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    sample(camera, viewWidth, viewHeight, player) {
      const up = keys.has('KeyW') || keys.has('ArrowUp');
      const down = keys.has('KeyS') || keys.has('ArrowDown');
      const left = keys.has('KeyA') || keys.has('ArrowLeft');
      const right = keys.has('KeyD') || keys.has('ArrowRight');
      const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const handbrake = keys.has('Space');
      const fire = mouseDown || keys.has('KeyJ');

      let aimAngle = null;
      if (hasMouseMoved && camera) {
        const worldMouseX = camera.x + (mouseX - viewWidth / 2) / camera.zoom;
        const worldMouseY = camera.y + (mouseY - viewHeight / 2) / camera.zoom;
        aimAngle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);
      }

      const out = {
        up,
        down,
        left,
        right,
        sprint,
        handbrake,
        fire,
        aimAngle,
        enterVehicle: oneshot.enterVehicle,
        melee: oneshot.melee,
        weaponSlot: oneshot.weaponSlot,
      };
      oneshot.enterVehicle = false;
      oneshot.melee = false;
      oneshot.weaponSlot = -1;
      return out;
    },
    takeSystemActions() {
      const res = {
        pause: oneshot.pause,
        confirm: oneshot.confirm,
        mute: oneshot.mute,
      };
      oneshot.pause = false;
      oneshot.confirm = false;
      oneshot.mute = false;
      return res;
    },
  };
}
