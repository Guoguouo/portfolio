(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function initHeroPerson() {
    const video = document.querySelector('.hero-person-source');
    const canvas = document.querySelector('.hero-person-canvas');
    const holder = document.querySelector('.hero-person');
    if (!video || !canvas || !holder) return;
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance'
    });
    if (!gl) return holder.remove();

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const vertexShader = compileShader(gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * .5 + .5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D u_video;
      varying vec2 v_uv;
      void main() {
        vec2 uv = vec2(mix(.22, .68, v_uv.x), v_uv.y);
        vec3 color = texture2D(u_video, uv).rgb;
        float other = max(color.r, color.b);
        float dominance = color.g - other;
        float greenKey = smoothstep(.10, .34, dominance) * smoothstep(.28, .72, color.g);
        float alpha = 1.0 - greenKey;
        float spill = max(0.0, dominance) * smoothstep(.02, .22, dominance);
        color.g = max(0.0, color.g - spill * .92);
        color = mix(color, vec3((color.r + color.b) * .5), greenKey * .18);
        gl_FragColor = vec4(color * alpha, alpha);
      }
    `);
    if (!vertexShader || !fragmentShader) return holder.remove();
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return holder.remove();
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const paint = () => {
      if (video.readyState < 2 || !video.videoWidth) return;
      const progress = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(1, Math.max(0, video.currentTime / video.duration))
        : 0;
      const horizontalPosition = 118 - progress * 136;
      holder.style.transform = `translate3d(calc(-50% + ${horizontalPosition.toFixed(3)}vw),0,0)`;
      holder.style.setProperty('--hero-alpha', '1');
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      holder.classList.add('is-ready');
    };

    const nextFrame = () => {
      paint();
      if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(nextFrame);
      else window.requestAnimationFrame(nextFrame);
    };

    video.muted = true;
    video.loop = true;
    video.addEventListener('loadeddata', () => {
      if (reduceMotion.matches) {
        video.currentTime = Number.isFinite(video.duration) ? video.duration * .5 : .18;
        video.pause();
        video.addEventListener('seeked', () => paint(), { once: true });
      } else {
        video.play().catch(() => undefined);
      }
      nextFrame(performance.now());
    }, { once: true });
    video.addEventListener('error', () => holder.remove());
  }

  function initHeroField() {
    const hero = document.querySelector('.portfolio-hero');
    const codeField = document.querySelector('.mouse-code');
    if (!hero || !codeField || reduceMotion.matches) return;
    const tokens = ['render()', 'latent:0.82', 'x += noise', 'AI/VIS/26', '0x77F5CC', 'prompt.shift()', '{frame:12}', 'seed_404'];
    let last = 0;
    hero.addEventListener('pointermove', (event) => {
      const now = performance.now();
      if (now - last < 75) return;
      last = now;
      const rect = hero.getBoundingClientRect();
      const tag = document.createElement('span');
      tag.textContent = tokens[Math.floor(Math.random() * tokens.length)];
      tag.style.left = `${event.clientX - rect.left}px`;
      tag.style.top = `${event.clientY - rect.top}px`;
      tag.style.setProperty('--drift-x', `${(Math.random() - .5) * 90}px`);
      tag.style.setProperty('--drift-y', `${-25 - Math.random() * 70}px`);
      codeField.appendChild(tag);
      window.setTimeout(() => tag.remove(), 900);
    }, { passive: true });

    let state = 0;
    window.setInterval(() => {
      state = (state + 1) % 4;
      hero.dataset.motion = String(state);
    }, 3200);
  }

  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    items.forEach((item) => observer.observe(item));
  }

  function initProjects() {
    const dialog = document.querySelector('.project-dialog');
    if (!dialog) return;
    const gallery = dialog.querySelector('.dialog-gallery');
    const hero = dialog.querySelector('.dialog-hero');
    const title = dialog.querySelector('.dialog-title');
    const kicker = dialog.querySelector('.dialog-kicker');
    const summary = dialog.querySelector('.dialog-summary');
    let dialogVideoObserver;
    const hmiMedia = [
      { type: 'video', src: './assets/projects/hmi/avatr-startup.mp4', label: '阿维塔开机动画' }
    ];
    for (let page = 58; page <= 72; page += 1) {
      hmiMedia.push({ type: 'image', src: `./assets/projects/hmi/hmi-${page}.png` });
      if (page === 61) hmiMedia.push({ type: 'video', src: './assets/projects/hmi/route-demo.mp4', label: '导航路线动效' });
    }
    const webMedia = Array.from({ length: 10 }, (_, index) => ({
      type: 'image',
      src: `./assets/projects/web/web-${index + 40}.png`
    }));
    const projects = {
      aigc: { title: '全球化 AIGC 人像素材生产', kicker: 'AIGC / COMMERCIAL VISUAL / 2025', summary: '以商业平台需求为约束，探索角色一致性、真实材质与批量交付之间的平衡。', pages: [4,5,6,7,8,9,10,11,12,13] },
      family: { title: '利楚六一家庭日全案视觉', kicker: 'CAMPAIGN / VISUAL SYSTEM / 2026', summary: '围绕“小小航海家”主题，从主视觉延展到线上传播与多空间线下物料。', hero: { type: 'video', src: './assets/projects/family/family-day-hero.mp4', label: '利楚六一家庭日项目视频' }, pages: [14,15,16,17,18,19,20,21,22,23] },
      xigua: { title: '西瓜视频 IP 营销视觉', kicker: 'IP DESIGN / CAMPAIGN / 2025', summary: '通过角色设定、传播海报、游戏界面和线下触点建立完整的 IP 营销体验。', pages: [24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39] },
      museum: { title: '中国国家博物馆海外版 APP', kicker: 'UI / UX / CULTURAL EXPERIENCE / 2025', summary: '从跨文化调研、信息架构到组件规范与高保真界面，完成完整移动体验设计。', pages: [40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63] },
      hmi: { title: '阿维塔 HMI 概念设计', kicker: 'HMI / CONCEPT / VISUAL DESIGN', summary: '以阿维塔智能座舱为场景，从品牌概念、视觉语言与图标系统延伸至仪表屏、导航、空调与音乐等关键界面。', media: hmiMedia },
      web: { title: '跨越速运官网视觉改版', kicker: 'WEB / REDESIGN / VISUAL SYSTEM', summary: '围绕跨境物流品牌的专业感、效率感与科技感，重构官网首屏、核心服务和移动端触点的视觉表达。', media: webMedia }
    };

    document.querySelectorAll('[data-project]').forEach((button) => button.addEventListener('click', () => {
      const project = projects[button.dataset.project];
      title.textContent = project.title;
      kicker.textContent = project.kicker;
      summary.textContent = project.summary;
      hero.replaceChildren();
      hero.hidden = !project.hero;
      if (project.hero?.type === 'video') {
        const heroVideo = document.createElement('video');
        heroVideo.src = project.hero.src;
        heroVideo.setAttribute('aria-label', project.hero.label || `${project.title}项目视频`);
        heroVideo.controls = true;
        heroVideo.loop = true;
        heroVideo.muted = true;
        heroVideo.autoplay = true;
        heroVideo.playsInline = true;
        heroVideo.preload = 'auto';
        hero.append(heroVideo);
      }
      const media = project.pages
        ? project.pages.map((page) => ({ type: 'image', src: `./assets/portfolio/page-${String(page).padStart(2, '0')}.jpg` }))
        : (project.media || [{ type: 'image', src: project.cover }]);
      gallery.replaceChildren(...media.map((item, index) => {
        if (item.type === 'video') {
          const video = document.createElement('video');
          video.src = item.src;
          video.setAttribute('aria-label', item.label || `${project.title}演示视频`);
          video.controls = true;
          video.loop = true;
          video.muted = true;
          video.autoplay = true;
          video.playsInline = true;
          video.preload = 'auto';
          return video;
        }
        const image = document.createElement('img');
        image.src = item.src;
        image.alt = `${project.title}作品页 ${index + 1}`;
        image.loading = index < 2 ? 'eager' : 'lazy';
        return image;
      }));
      dialogVideoObserver?.disconnect();
      const dialogVideos = [...dialog.querySelectorAll('video')];
      dialog.showModal();
      dialog.scrollTop = 0;
      if ('IntersectionObserver' in window) {
        dialogVideoObserver = new IntersectionObserver((entries) => {
          entries.forEach(({ target, isIntersecting }) => {
            if (isIntersecting) target.play().catch(() => undefined);
            else target.pause();
          });
        }, { root: dialog, rootMargin: '160px 0px', threshold: .05 });
        dialogVideos.forEach((video) => dialogVideoObserver.observe(video));
      } else {
        dialogVideos.forEach((video) => video.play().catch(() => undefined));
      }
      dialogVideos.forEach((video) => video.play().catch(() => undefined));
    }));
    const closeDialog = () => {
      dialog.querySelectorAll('video').forEach((video) => video.pause());
      dialogVideoObserver?.disconnect();
      dialog.close();
    };
    dialog.querySelector('.dialog-close').addEventListener('click', closeDialog);
    dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  }

  function initProjectRail() {
    const stage = document.querySelector('.project-marquee');
    const track = stage?.querySelector('.project-track');
    const cards = track ? [...track.querySelectorAll('.poster-card.poster-artwork')] : [];
    if (!stage || !track || !cards.length || reduceMotion.matches) return;

    stage.classList.add('rail-ready');
    let completedSteps = 0;
    let phaseElapsed = 0;
    let lastTime = performance.now();
    let paused = false;
    let visible = true;

    const wrap = (value, length) => ((value % length) + length) % length;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const smoothstep = (value) => value * value * (3 - 2 * value);

    const render = (now) => {
      const dt = Math.min((now - lastTime) / 1000, .05);
      lastTime = now;
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const cardWidth = cards[0].offsetWidth;
      const cardHeight = cards[0].offsetHeight;
      const step = cardWidth * (width < 720 ? .84 : .88);
      const cycle = cards.length * step;
      const holdDuration = width < 720 ? 820 : 940;
      const glideDuration = width < 720 ? 1320 : 1420;
      const phaseDuration = holdDuration + glideDuration;

      if (!paused && visible) {
        phaseElapsed += dt * 1000;
        while (phaseElapsed >= phaseDuration) {
          phaseElapsed -= phaseDuration;
          completedSteps += 1;
        }
      }

      const rawProgress = clamp((phaseElapsed - holdDuration) / glideDuration, 0, 1);
      const glideProgress = rawProgress < .5
        ? 16 * Math.pow(rawProgress, 5)
        : 1 - Math.pow(-2 * rawProgress + 2, 5) / 2;
      const travel = (completedSteps + glideProgress) * step;
      const startOffset = width / 2 - cardWidth / 2 - step * 2;

      cards.forEach((card, index) => {
        const x = wrap(index * step - travel + startOffset + cardWidth, cycle) - cardWidth;
        const center = x + cardWidth / 2;
        const progress = clamp(center / width, 0, 1);
        const side = (progress - .5) * 2;
        const distance = Math.abs(side);
        const turnAmount = smoothstep(clamp((distance - .08) / .92, 0, 1));
        const rotateY = -Math.sign(side || 1) * turnAmount * (width < 720 ? 20 : 31);
        const rotateZ = -side * (width < 720 ? 1.3 : 2.2);
        const y = Math.max(6, (height - cardHeight) / 2) + Math.pow(distance, 1.65) * (width < 720 ? 23 : 34);
        const z = (1 - distance) * 54;
        const scale = 1.025 - distance * .095;
        const edgeFade = clamp((width + cardWidth * .42 - Math.abs(center - width / 2) * 2) / cardWidth, .32, 1);

        card.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
        card.style.opacity = String(edgeFade);
        card.style.zIndex = String(Math.round((1 - distance) * 100));
      });

      requestAnimationFrame(render);
    };

    stage.addEventListener('pointerenter', () => { paused = true; });
    stage.addEventListener('pointerleave', () => { paused = false; });
    stage.addEventListener('focusin', () => { paused = true; });
    stage.addEventListener('focusout', () => { paused = false; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: .02 }).observe(stage);
    }

    requestAnimationFrame(() => {
      stage.classList.add('is-entered');
      requestAnimationFrame(render);
    });
  }

  function initCopy() {
    document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(button.dataset.copy).catch(() => undefined);
      const original = button.textContent;
      button.textContent = 'COPIED ✓';
      window.setTimeout(() => { button.textContent = original; }, 1600);
    }));
  }

  function initReferenceGallery() {
    const media = document.querySelectorAll('.work-tile img, .work-tile video, .work-tile iframe');
    if (!media.length) return;
    media.forEach((item) => {
      const tile = item.closest('.work-tile');
      const ready = () => {
        item.classList.add('loaded');
        tile?.classList.add('media-loaded');
      };
      if (item.tagName === 'IMG' && item.complete) ready();
      else item.addEventListener(item.tagName === 'VIDEO' ? 'canplay' : 'load', ready, { once: true });
    });

    const motions = [...document.querySelectorAll('.work-tile .tile-motion')];
    if (!motions.length || reduceMotion.matches) return;
    const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const activate = (motion, restart = false) => {
      const tile = motion.closest('.work-tile');
      if (motion.tagName === 'VIDEO') {
        if (restart) motion.currentTime = 0;
        motion.play().catch(() => undefined);
      }
      tile?.classList.add('is-motion-active');
    };
    const deactivate = (motion) => {
      if (motion.tagName === 'VIDEO') {
        motion.pause();
        motion.currentTime = 0;
      }
      motion.closest('.work-tile')?.classList.remove('is-motion-active');
    };

    motions.forEach((motion) => {
      const tile = motion.closest('.work-tile');
      if (!tile) return;
      tile.addEventListener('pointerenter', () => activate(motion, true));
      tile.addEventListener('pointerleave', () => deactivate(motion));
      tile.addEventListener('focusin', () => activate(motion, true));
      tile.addEventListener('focusout', () => deactivate(motion));
    });

    if (!hoverCapable && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
          if (isIntersecting && intersectionRatio >= .62) activate(target);
          else deactivate(target);
        });
      }, { threshold: [0, .62, 1] });
      motions.forEach((motion) => observer.observe(motion));
    }
  }

  function initBrainkaStory() {
    const story = document.querySelector('.brainka-story');
    if (!story || reduceMotion.matches) return;
    if (!('IntersectionObserver' in window)) {
      story.classList.add('is-playing');
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      const active = entry.isIntersecting && entry.intersectionRatio > .18;
      story.classList.toggle('is-playing', active);
      document.body.classList.toggle('brainka-in-view', active);
    }, { threshold: [0, .18, .6] });
    observer.observe(story);
  }

  initHeroPerson();
  initHeroField();
  initReveal();
  initProjectRail();
  initProjects();
  initCopy();
  initReferenceGallery();
  initBrainkaStory();
})();
