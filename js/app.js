/*
  AR Worm Gear Assembly - Drag & Drop + Snap + Guidance + Animation
  Uses A-Frame + AR.js marker tracking (Hiro). Replace marker for production if needed.
*/

(function(){
  const WATERMARK = document.getElementById('watermark');
  const STEPS = [
    { id: 'crankshaft', snap: 'snap_crankshaft', text: 'Step 1: Drag the crankshaft to the center base.' },
    { id: 'worm',       snap: 'snap_worm',       text: 'Step 2: Place the worm so it meshes with the gear area (right side).' },
    { id: 'gear',       snap: 'snap_gear',       text: 'Step 3: Place the gear on its seat (center). Then press Play.' }
  ];

  const setWatermark = (msg) => { if (WATERMARK) WATERMARK.textContent = msg; };

  AFRAME.registerComponent('draggable', {
    init: function(){
      this.el.classList.add('draggable');
      this._dragging = false;
      this._offset = new THREE.Vector3();

      this.onGrab = this.onGrab.bind(this);
      this.onDrop = this.onDrop.bind(this);
      this.onMove = this.onMove.bind(this);

      this.el.addEventListener('mousedown', this.onGrab);
      this.el.addEventListener('touchstart', this.onGrab);
      window.addEventListener('mouseup', this.onDrop);
      window.addEventListener('touchend', this.onDrop);
      window.addEventListener('mousemove', this.onMove);
      window.addEventListener('touchmove', this.onMove, {passive:false});
    },
    remove: function(){
      this.el.removeEventListener('mousedown', this.onGrab);
      this.el.removeEventListener('touchstart', this.onGrab);
      window.removeEventListener('mouseup', this.onDrop);
      window.removeEventListener('touchend', this.onDrop);
      window.removeEventListener('mousemove', this.onMove);
      window.removeEventListener('touchmove', this.onMove);
    },
    onGrab: function(e){
      e.preventDefault();
      this._dragging = true;
    },
    onDrop: function(){
      if (!this._dragging) return;
      this._dragging = false;
      this.el.emit('drag-dropped');
    },
    screenToWorld: function(x, y){
      const sceneEl = this.el.sceneEl;
      const camera = sceneEl.camera;
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(
        (x / window.innerWidth) * 2 - 1,
        -(y / window.innerHeight) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      // Intersect with a plane aligned with marker/base (y ~ 0.15)
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.15);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, point);
      return point;
    },
    onMove: function(e){
      if (!this._dragging) return;
      const touch = e.touches && e.touches[0];
      const x = touch ? touch.clientX : e.clientX;
      const y = touch ? touch.clientY : e.clientY;
      const world = this.screenToWorld(x, y);
      if (!world) return;
      // Convert world to marker space by parenting under same root
      const root = document.getElementById('assemblyRoot');
      const rootObj = root.object3D;
      const inv = new THREE.Matrix4().copy(rootObj.matrixWorld).invert();
      const p = world.clone().applyMatrix4(inv);
      this.el.object3D.position.copy(p);
    }
  });

  AFRAME.registerComponent('snap-zone', {
    schema: { accept: {type:'string'}, p: {type:'vec3'}, r: {type:'vec3'}, tol: {type:'number', default: 0.08} },
    init: function(){
      this.target = null; // accepted entity when snapped
    },
    trySnap: function(entity){
      if (!entity || entity.id !== this.data.accept) return false;
      const zone = this.el.object3D;
      const ent = entity.object3D;
      const dz = zone.getWorldPosition(new THREE.Vector3());
      const de = ent.getWorldPosition(new THREE.Vector3());
      const dist = dz.distanceTo(de);
      if (dist <= this.data.tol){
        // Snap using local p/r relative to assembly root
        entity.setAttribute('position', `${this.data.p.x} ${this.data.p.y} ${this.data.p.z}`);
        entity.setAttribute('rotation', `${this.data.r.x} ${this.data.r.y} ${this.data.r.z}`);
        entity.removeAttribute('draggable');
        this.target = entity;
        this.el.emit('snapped', { id: entity.id });
        return true;
      }
      return false;
    }
  });

  AFRAME.registerComponent('assembly-manager', {
    init: function(){
      this.stepIndex = 0;
      this.animating = false;
      setWatermark(STEPS[0].text);

      // Listen for drops and evaluate snapping
      ['crankshaft','worm','gear'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('drag-dropped', () => this.evaluateSnap(el));
      });

      // Visual guidance pulses
      this.guidePulseInterval = null;
      this.startPulse();
    },
    resetAssembly: function(){
      this.stepIndex = 0;
      setWatermark(STEPS[0].text);
      this.animating = false;

      // Re-enable dragging and reset positions
      const crank = document.getElementById('crankshaft'); crank.setAttribute('draggable',''); crank.setAttribute('position','-0.5 0.15 0'); crank.setAttribute('rotation','0 0 90');
      const worm = document.getElementById('worm'); worm.setAttribute('draggable',''); worm.setAttribute('position','0.7 0.22 0'); worm.setAttribute('rotation','0 0 0');
      const gear = document.getElementById('gear'); gear.setAttribute('draggable',''); gear.setAttribute('position','0 0.25 -0.45'); gear.setAttribute('rotation','0 0 0');

      // Stop animation
      this.setSpin(false);
    },
    showHint: function(){
      const step = STEPS[this.stepIndex];
      const zone = document.getElementById(step.snap);
      // Blink the zone by toggling a helper
      this.flashHelper(zone);
    },
    startPulse: function(){
      const pulse = () => {
        const step = STEPS[this.stepIndex];
        const zone = document.getElementById(step.snap);
        this.flashHelper(zone);
      };
      this.guidePulseInterval = setInterval(pulse, 4000);
    },
    flashHelper: function(zone){
      if (!zone) return;
      const helper = document.createElement('a-ring');
      helper.setAttribute('radius-inner','0.05');
      helper.setAttribute('radius-outer','0.08');
      helper.setAttribute('rotation','-90 0 0');
      const p = zone.getAttribute('snap-zone').p;
      helper.setAttribute('position', `${p.x} ${p.y + 0.02} ${p.z}`);
      helper.setAttribute('color','#ffff66');
      helper.setAttribute('opacity','0.8');
      helper.setAttribute('animation','property: opacity; to: 0; dur: 1200; easing: easeOutQuad');
      const root = document.getElementById('assemblyRoot');
      root.appendChild(helper);
      setTimeout(()=> helper.parentNode && helper.parentNode.removeChild(helper), 1300);
    },
    evaluateSnap: function(entity){
      const step = STEPS[this.stepIndex];
      if (!step) return;
      if (entity.id !== step.id){
        setWatermark(`Not yet. ${step.text}`);
        this.flashRed(entity);
        return;
      }
      const zone = document.getElementById(step.snap);
      const snapped = zone.components['snap-zone'].trySnap(entity);
      if (snapped){
        this.stepIndex++;
        if (this.stepIndex < STEPS.length){
          setWatermark(STEPS[this.stepIndex].text);
        } else {
          setWatermark('Assembled! Press Play to run the crankshaft.');
        }
      } else {
        setWatermark(`Get closer to the target position. ${step.text}`);
        this.flashRed(entity);
      }
    },
    flashRed: function(entity){
      const mat = entity.getAttribute('material') || {};
      const prev = mat.color || '#ffffff';
      entity.setAttribute('material','color: #ff6666');
      setTimeout(()=> entity.setAttribute('material', `color: ${prev}`), 350);
    },
    toggleAnimation: function(){
      this.animating = !this.animating;
      this.setSpin(this.animating);
      if (this.animating) setWatermark('Running. Tap Play/Stop to toggle.');
    },
    setSpin: function(on){
      const crank = document.getElementById('crankshaft');
      const gear = document.getElementById('gear');
      // Apply simple rotation animations
      if (on){
        crank.setAttribute('animation__spin', 'property: rotation; to: 0 0 450; loop: true; dur: 2000; easing: linear');
        gear.setAttribute('animation__spin', 'property: rotation; to: 0 0 -360; loop: true; dur: 2200; easing: linear');
      } else {
        crank.removeAttribute('animation__spin');
        gear.removeAttribute('animation__spin');
      }
    }
  });
})();
