(() => {
  "use strict";

  const DEMO_COUNT = 30;
  const SPIN_DPS = 36;
  const SWIPE_PX = 420;
  const MAX_SHOTS = 36;
  const VIDEO_FRAMES = 24;
  const SESSION_KEY = "lingkar-session";
  const HINT_KEY = "lingkar-hint";
  const SVG_NS = "http://www.w3.org/2000/svg";

  const ZONES = [
    { at: 0, name: "Depan", short: "depan" },
    { at: 45, name: "Depan kiri", short: "depan kiri" },
    { at: 90, name: "Sisi kiri", short: "sisi kiri" },
    { at: 135, name: "Belakang kiri", short: "belakang kiri" },
    { at: 180, name: "Belakang", short: "belakang" },
    { at: 225, name: "Belakang kanan", short: "belakang kanan" },
    { at: 270, name: "Sisi kanan", short: "sisi kanan" },
    { at: 315, name: "Depan kanan", short: "depan kanan" },
  ];

  const $ = (id) => document.getElementById(id);

  const els = {
    tabDemo: $("tab-demo"),
    tabMine: $("tab-mine"),
    help: $("help"),
    source: $("source"),
    stage: $("stage"),
    photo: $("photo"),
    empty: $("empty"),
    emptyAdd: $("empty-add"),
    degree: $("degree"),
    angleName: $("angle-name"),
    coverage: $("coverage-label"),
    hint: $("hint"),
    ring: $("ring"),
    ticks: $("ring-ticks"),
    dots: $("ring-shots"),
    needle: $("needle"),
    spin: $("spin"),
    play: document.querySelector(".icon-play"),
    pause: document.querySelector(".icon-pause"),
    add: $("add-btn"),
    edit: $("edit-btn"),
    remove: $("remove-btn"),
    sessions: $("sessions-btn"),
    strip: $("strip"),
    sheet: $("sheet"),
    presets: $("presets"),
    camera: $("use-camera"),
    library: $("use-library"),
    pickCamera: $("pick-camera"),
    pickLibrary: $("pick-library"),
    previewTitle: $("preview-title"),
    previewLead: $("preview-lead"),
    previewImg: $("preview-img"),
    previewAngle: $("preview-angle"),
    previewRange: $("preview-range"),
    previewCancel: $("preview-cancel"),
    previewSave: $("preview-save"),
    sessionTitle: $("session-title"),
    sessionList: $("session-list"),
    newSession: $("new-session"),
    deleteSession: $("delete-session"),
    busyText: $("busy-text"),
    busyBar: $("busy-bar"),
    toast: $("toast"),
    live: $("live"),
  };

  const state = {
    mode: "demo",
    yaw: 0,
    velocity: 0,
    settle: null,
    gliding: false,
    spinning: false,
    pointer: null,
    pointers: new Map(),
    presetAngle: 0,
    sessionId: null,
    sessions: [],
    shots: [],
    urls: [],
    pending: null,
    dotId: null,
    stripId: null,
    announced: "",
    demo: Array.from({ length: DEMO_COUNT }, (_, index) => ({
      id: `demo-${index}`,
      angle: (index / DEMO_COUNT) * 360,
      url: `demo/f_${String(index + 1).padStart(2, "0")}.jpg`,
    })),
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function wrap(deg) {
    return ((deg % 360) + 360) % 360;
  }

  function angularDistance(a, b) {
    const delta = Math.abs(wrap(a) - wrap(b));
    return Math.min(delta, 360 - delta);
  }

  function signedDelta(from, to) {
    let delta = wrap(to) - wrap(from);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return delta;
  }

  function nearest(shots, yaw) {
    let best = null;
    let bestDistance = Infinity;
    for (const shot of shots) {
      const distance = angularDistance(shot.angle, yaw);
      if (distance < bestDistance) {
        best = shot;
        bestDistance = distance;
      }
    }
    return best;
  }

  function zoneAt(angle) {
    let best = ZONES[0];
    let bestDistance = Infinity;
    for (const zone of ZONES) {
      const distance = angularDistance(angle, zone.at);
      if (distance < bestDistance) {
        best = zone;
        bestDistance = distance;
      }
    }
    return best;
  }

  function polar(angle, radius) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return [60 + radius * Math.cos(rad), 60 + radius * Math.sin(rad)];
  }

  function currentShots() {
    return state.mode === "demo" ? state.demo : state.shots;
  }

  function currentSession() {
    return state.sessions.find((session) => session.id === state.sessionId) || null;
  }

  function coveredCount(shots) {
    return ZONES.filter((zone) =>
      shots.some((shot) => angularDistance(shot.angle, zone.at) <= 22.5),
    ).length;
  }

  function missingShort(shots) {
    return ZONES.filter(
      (zone) => !shots.some((shot) => angularDistance(shot.angle, zone.at) <= 22.5),
    ).map((zone) => zone.short);
  }

  function defaultTitle() {
    const label = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
    }).format(new Date());
    return `Tubuh ${label}`;
  }

  let toastTimer = 0;
  let spinTouched = false;
  function sourceLabel() {
    if (state.mode === "demo") return "Contoh dari video putaran di repo";
    return currentSession()?.title || "Belum ada sesi";
  }
  function toast(message) {
    els.source.dataset.toasting = "1";
    els.source.textContent = message;
    els.live.textContent = message;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      delete els.source.dataset.toasting;
      els.source.textContent = sourceLabel();
    }, 2600);
  }

  function toastError(error, fallback) {
    const known = new Set([
      "Besar video maksimal 100 MB.",
      "Video tidak bisa dibaca.",
      "Video terlalu pendek untuk satu putaran.",
      "Video maksimal 90 detik.",
    ]);
    if (error?.name === "QuotaExceededError") toast("Penyimpanan HP penuh.");
    else if (known.has(error?.message)) toast(error.message);
    else toast(fallback);
  }

  function reqToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("aborted"));
    });
  }

  const mem = { sessions: [], shots: [] };

  const store = {
    db: null,
    memory: false,
    async init() {
      try {
        this.db = await new Promise((resolve, reject) => {
          const request = indexedDB.open("lingkar", 1);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("sessions")) {
              db.createObjectStore("sessions", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("shots")) {
              const shots = db.createObjectStore("shots", { keyPath: "id" });
              shots.createIndex("sessionId", "sessionId");
            }
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        this.db = null;
        this.memory = true;
      }
    },
    async listSessions() {
      if (!this.db) {
        return mem.sessions.map((session) => ({ ...session })).sort((a, b) => b.updatedAt - a.updatedAt);
      }
      const tx = this.db.transaction("sessions", "readonly");
      const all = await reqToPromise(tx.objectStore("sessions").getAll());
      return all.sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async getShots(sessionId) {
      if (!this.db) {
        return mem.shots
          .filter((shot) => shot.sessionId === sessionId)
          .map((shot) => ({ ...shot }))
          .sort((a, b) => a.angle - b.angle);
      }
      const tx = this.db.transaction("shots", "readonly");
      const all = await reqToPromise(tx.objectStore("shots").index("sessionId").getAll(sessionId));
      return all.sort((a, b) => a.angle - b.angle);
    },
    async putSession(session) {
      if (!this.db) {
        const index = mem.sessions.findIndex((item) => item.id === session.id);
        if (index >= 0) mem.sessions[index] = { ...session };
        else mem.sessions.push({ ...session });
        return;
      }
      const tx = this.db.transaction("sessions", "readwrite");
      tx.objectStore("sessions").put(session);
      await txDone(tx);
    },
    async putShots(shots) {
      if (!shots.length) return;
      if (!this.db) {
        for (const shot of shots) {
          const index = mem.shots.findIndex((item) => item.id === shot.id);
          if (index >= 0) mem.shots[index] = shot;
          else mem.shots.push(shot);
        }
        return;
      }
      const tx = this.db.transaction("shots", "readwrite");
      const bucket = tx.objectStore("shots");
      for (const shot of shots) bucket.put(shot);
      await txDone(tx);
    },
    async deleteShot(id) {
      if (!this.db) {
        mem.shots = mem.shots.filter((shot) => shot.id !== id);
        return;
      }
      const tx = this.db.transaction("shots", "readwrite");
      tx.objectStore("shots").delete(id);
      await txDone(tx);
    },
    async deleteSession(id) {
      if (!this.db) {
        mem.sessions = mem.sessions.filter((session) => session.id !== id);
        mem.shots = mem.shots.filter((shot) => shot.sessionId !== id);
        return;
      }
      const tx = this.db.transaction(["sessions", "shots"], "readwrite");
      tx.objectStore("sessions").delete(id);
      const keys = await reqToPromise(tx.objectStore("shots").index("sessionId").getAllKeys(id));
      for (const key of keys) tx.objectStore("shots").delete(key);
      await txDone(tx);
    },
  };

  function drawTicks() {
    els.ticks.replaceChildren();
    for (const zone of ZONES) {
      const [x1, y1] = polar(zone.at, zone.at % 90 === 0 ? 44 : 46);
      const [x2, y2] = polar(zone.at, 52);
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", x1.toFixed(2));
      line.setAttribute("y1", y1.toFixed(2));
      line.setAttribute("x2", x2.toFixed(2));
      line.setAttribute("y2", y2.toFixed(2));
      line.setAttribute("class", zone.at % 90 === 0 ? "tick major" : "tick");
      els.ticks.append(line);
    }
  }

  function buildDots(shots) {
    els.dots.replaceChildren();
    for (const shot of shots) {
      const [cx, cy] = polar(shot.angle, 38);
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("cx", cx.toFixed(2));
      dot.setAttribute("cy", cy.toFixed(2));
      dot.setAttribute("r", shots.length > 18 ? "2.1" : "3");
      dot.setAttribute("class", "shot-dot");
      dot.dataset.id = shot.id;
      els.dots.append(dot);
    }
  }

  function buildStrip(shots) {
    els.strip.replaceChildren();
    els.strip.hidden = shots.length === 0;
    for (const shot of shots) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.id = shot.id;
      button.setAttribute("role", "option");
      button.setAttribute("aria-label", `${Math.round(shot.angle)} derajat, ${zoneAt(shot.angle).name}`);
      const image = document.createElement("img");
      image.alt = "";
      image.src = shot.url;
      image.draggable = false;
      button.append(image);
      button.addEventListener("click", () => jumpTo(shot.angle));
      els.strip.append(button);
    }
  }

  function renderSpin() {
    const on = state.spinning;
    els.spin.setAttribute("aria-pressed", String(on));
    els.spin.setAttribute("aria-label", on ? "Jeda putaran" : "Putar otomatis");
    els.spin.classList.toggle("on", on);
    els.play.hidden = on;
    els.pause.hidden = !on;
  }

  function renderChrome() {
    const demo = state.mode === "demo";
    const shots = currentShots();
    els.tabDemo.setAttribute("aria-selected", String(demo));
    els.tabMine.setAttribute("aria-selected", String(!demo));
    if (!els.source.dataset.toasting) els.source.textContent = sourceLabel();
    const filled = coveredCount(shots);
    els.coverage.textContent = demo ? "Contoh 360°" : shots.length ? `${filled}/8 sisi` : "Belum ada foto";
    if (demo) {
      els.hint.textContent = "Geser ke samping untuk memutar";
    } else if (!shots.length) {
      els.hint.textContent = "";
    } else if (filled < 8) {
      const missing = missingShort(shots);
      els.hint.textContent = `Kurang ${missing.slice(0, 2).join(" dan ")}`;
    } else {
      els.hint.textContent = "Geser untuk meninjau seluruh tubuh";
    }
    els.add.textContent = demo ? "Pakai foto saya" : "Tambah";
    els.add.setAttribute("aria-label", demo ? "Pakai foto saya" : "Tambah sudut");
    const canEdit = !demo && shots.length > 0;
    els.edit.hidden = !canEdit;
    els.remove.hidden = !canEdit;
    els.sessions.hidden = demo;
    els.spin.disabled = shots.length < 2;
    if (els.spin.disabled) state.spinning = false;
    renderSpin();
    buildStrip(shots);
    buildDots(shots);
    state.dotId = null;
    state.stripId = null;
    delete els.photo.dataset.shot;
    publish(false);
  }

  function publish(announce) {
    const shots = currentShots();
    const shot = nearest(shots, state.yaw);
    const shownAngle = shot ? shot.angle : state.yaw;
    const zone = zoneAt(state.pointer || state.spinning || state.gliding ? state.yaw : shownAngle);
    const degree = Math.round(wrap(state.pointer || state.spinning || state.gliding ? state.yaw : shownAngle));
    els.degree.textContent = `${degree}°`;
    els.angleName.textContent = zone.name;
    els.stage.setAttribute("aria-valuenow", String(degree));
    els.stage.setAttribute("aria-valuetext", `${degree} derajat, ${zone.name}`);
    els.needle.setAttribute("transform", `rotate(${wrap(state.yaw).toFixed(2)} 60 60)`);
    if (shot) {
      els.photo.hidden = false;
      els.empty.hidden = true;
      if (els.photo.dataset.shot !== shot.id) {
        els.photo.dataset.shot = shot.id;
        els.photo.src = shot.url;
        els.photo.alt = `${zoneAt(shot.angle).name}, ${Math.round(shot.angle)} derajat`;
        markActive(shot.id);
      }
    } else {
      els.photo.hidden = true;
      els.empty.hidden = false;
      els.degree.textContent = "—";
      els.angleName.textContent = "Belum ada sudut";
      els.needle.setAttribute("transform", "rotate(0 60 60)");
      delete els.photo.dataset.shot;
    }
    if (announce && !state.spinning) {
      const message = `${degree} derajat, ${zone.name}`;
      if (message !== state.announced) {
        state.announced = message;
        els.live.textContent = message;
      }
    }
  }

  function markActive(id) {
    if (state.stripId !== id) {
      state.stripId = id;
      for (const button of els.strip.children) {
        const on = button.dataset.id === id;
        button.classList.toggle("on", on);
        button.setAttribute("aria-selected", String(on));
        if (on && !state.spinning && !state.pointer) {
          button.scrollIntoView({ inline: "center", block: "nearest" });
        }
      }
    }
    if (state.dotId !== id) {
      state.dotId = id;
      for (const dot of els.dots.children) dot.classList.toggle("hot", dot.dataset.id === id);
    }
  }

  function jumpTo(angle) {
    state.spinning = false;
    state.velocity = 0;
    state.gliding = false;
    state.settle = null;
    state.yaw = wrap(angle);
    renderSpin();
    publish(true);
  }

  function stepShot(direction) {
    const shots = currentShots().slice().sort((a, b) => a.angle - b.angle);
    if (!shots.length) return;
    const yaw = wrap(state.yaw);
    if (direction > 0) {
      jumpTo((shots.find((shot) => shot.angle > yaw + 0.5) || shots[0]).angle);
      return;
    }
    jumpTo(([...shots].reverse().find((shot) => shot.angle < yaw - 0.5) || shots[shots.length - 1]).angle);
  }

  function step(dt) {
    if (state.pointer) return;
    if (state.spinning) {
      state.yaw = wrap(state.yaw + SPIN_DPS * dt);
      publish(false);
      return;
    }
    if (state.gliding) {
      state.yaw = wrap(state.yaw + state.velocity * dt);
      state.velocity *= Math.exp(-3.4 * dt);
      if (Math.abs(state.velocity) < 12) {
        state.gliding = false;
        state.velocity = 0;
        const shot = nearest(currentShots(), state.yaw);
        state.settle = shot ? shot.angle : null;
      }
      publish(false);
      return;
    }
    if (state.settle == null) return;
    const delta = signedDelta(state.yaw, state.settle);
    if (Math.abs(delta) < 0.4) {
      state.yaw = state.settle;
      state.settle = null;
      publish(true);
      return;
    }
    state.yaw = wrap(state.yaw + delta * Math.min(1, dt * 9));
    publish(false);
  }

  function dismissHint() {
    els.hint.classList.add("dim");
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch (error) {
      /* private mode */
    }
  }

  function bindPointer(target, mode) {
    target.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target.closest("button")) return;
      if (currentShots().length < 2) return;
      spinTouched = true;
      state.spinning = false;
      state.settle = null;
      state.gliding = false;
      renderSpin();
      dismissHint();
      target.setPointerCapture(event.pointerId);
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      state.pointer = {
        mode,
        x: event.clientX,
        y: event.clientY,
        t: performance.now(),
        id: event.pointerId,
      };
      if (mode === "ring") {
        state.yaw = angleFromRing(event);
        publish(false);
      }
    });

    target.addEventListener("pointermove", (event) => {
      if (!state.pointer || event.pointerId !== state.pointer.id) return;
      if (state.pointer.mode === "ring") {
        state.yaw = angleFromRing(event);
        publish(false);
        return;
      }
      const now = performance.now();
      const dt = Math.max(0.016, (now - state.pointer.t) / 1000);
      const dx = event.clientX - state.pointer.x;
      state.pointer.x = event.clientX;
      state.pointer.t = now;
      const dyaw = -dx * (360 / SWIPE_PX);
      state.yaw = wrap(state.yaw + dyaw);
      state.velocity = dyaw / dt;
      publish(false);
    });

    const end = (event) => {
      if (!state.pointer || event.pointerId !== state.pointer.id) return;
      state.pointers.delete(event.pointerId);
      const flung = state.pointer.mode === "stage" && Math.abs(state.velocity) > 80;
      state.pointer = null;
      if (flung) {
        state.gliding = true;
        return;
      }
      state.velocity = 0;
      const shot = nearest(currentShots(), state.yaw);
      state.settle = shot ? shot.angle : null;
      if (state.settle != null && angularDistance(state.yaw, state.settle) < 0.4) {
        state.yaw = state.settle;
        state.settle = null;
        publish(true);
      }
    };
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  }

  function angleFromRing(event) {
    const rect = els.ring.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    let deg = (Math.atan2(x, -y) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return deg;
  }

  function openSheet(name) {
    for (const section of els.sheet.querySelectorAll(".sheet-body > section")) {
      section.hidden = section.id !== `panel-${name}`;
    }
    if (state.spinning) {
      state.spinning = false;
      spinTouched = true;
      renderSpin();
    }
    if (name === "add") renderPresets();
    if (name === "sessions") renderSessions();
    if (!els.sheet.open) els.sheet.showModal();
  }

  function renderPresets() {
    for (const button of els.presets.querySelectorAll("button")) {
      const angle = Number(button.dataset.angle);
      const has = state.shots.some((shot) => angularDistance(shot.angle, angle) <= 22.5);
      button.classList.toggle("on", angle === state.presetAngle);
      button.classList.toggle("has", has);
    }
  }

  function firstGap() {
    for (const zone of ZONES) {
      if (!state.shots.some((shot) => angularDistance(shot.angle, zone.at) <= 22.5)) return zone.at;
    }
    return 0;
  }

  function renderSessions() {
    const session = currentSession();
    els.sessionTitle.disabled = !session;
    els.sessionTitle.value = session ? session.title : "";
    els.deleteSession.hidden = !session;
    els.sessionList.replaceChildren();
    if (!state.sessions.length) {
      const note = document.createElement("p");
      note.className = "lead";
      note.textContent = "Belum ada sesi. Tambah foto, atau buat sesi kosong dulu.";
      els.sessionList.append(note);
      return;
    }
    for (const item of state.sessions) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.title;
      button.classList.toggle("on", item.id === state.sessionId);
      button.addEventListener("click", () => activateSession(item.id));
      els.sessionList.append(button);
    }
  }

  function revokePending() {
    if (state.pending?.url && state.pending.ownsUrl) URL.revokeObjectURL(state.pending.url);
    state.pending = null;
  }

  function setPreviewAngle(angle) {
    const wrapped = Math.round(wrap(angle)) % 360;
    els.previewRange.value = String(wrapped);
    els.previewAngle.textContent = `${wrapped}° · ${zoneAt(wrapped).name}`;
  }

  function openPreview({ url, blob, width, height, angle, editingId, ownsUrl }) {
    revokePending();
    state.pending = { url, blob, width, height, editingId: editingId || null, ownsUrl: Boolean(ownsUrl) };
    els.previewImg.src = url;
    els.previewTitle.textContent = editingId ? "Ubah sudut" : "Cek bingkai";
    els.previewLead.textContent = editingId
      ? "Geser sampai derajatnya cocok dengan sisi tubuh pada foto."
      : "Seluruh tubuh sebaiknya terlihat, dari kepala sampai kaki.";
    setPreviewAngle(angle);
    openSheet("preview");
  }

  async function ensureSession() {
    if (state.sessionId && currentSession()) return;
    const session = {
      id: crypto.randomUUID(),
      title: defaultTitle(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await store.putSession(session);
    state.sessions.unshift(session);
    state.sessionId = session.id;
    try {
      localStorage.setItem(SESSION_KEY, session.id);
    } catch (error) {
      /* ignore */
    }
  }

  function touchSession() {
    const session = currentSession();
    if (!session) return Promise.resolve();
    session.updatedAt = Date.now();
    return store.putSession(session);
  }

  async function refreshShots() {
    state.shots = state.sessionId ? await store.getShots(state.sessionId) : [];
    const previous = state.urls;
    state.urls = [];
    for (const shot of state.shots) {
      shot.url = URL.createObjectURL(shot.blob);
      state.urls.push(shot.url);
    }
    renderChrome();
    for (const url of previous) URL.revokeObjectURL(url);
  }

  async function activateSession(id) {
    state.sessionId = id;
    state.mode = "mine";
    state.spinning = false;
    try {
      localStorage.setItem(SESSION_KEY, id);
    } catch (error) {
      /* ignore */
    }
    await refreshShots();
    renderSessions();
  }

  async function savePending() {
    const pending = state.pending;
    if (!pending) return;
    const angle = Number(els.previewRange.value);
    try {
      await ensureSession();
      const clashes = state.shots.filter(
        (shot) => angularDistance(shot.angle, angle) < 8 && shot.id !== pending.editingId,
      );
      for (const clash of clashes) await store.deleteShot(clash.id);
      if (pending.editingId) {
        const existing = state.shots.find((shot) => shot.id === pending.editingId);
        if (!existing) throw new Error("missing");
        existing.angle = angle;
        await store.putShots([existing]);
      } else {
        if (state.shots.length >= MAX_SHOTS) {
          toast(`Maksimal ${MAX_SHOTS} sudut per sesi.`);
          return;
        }
        await store.putShots([
          {
            id: crypto.randomUUID(),
            sessionId: state.sessionId,
            angle,
            blob: pending.blob,
            width: pending.width,
            height: pending.height,
            createdAt: Date.now(),
          },
        ]);
      }
      await touchSession();
      state.mode = "mine";
      state.yaw = angle;
      state.settle = null;
      state.velocity = 0;
      state.spinning = false;
      if (state.pending === pending) state.pending = null;
      if (pending.ownsUrl) URL.revokeObjectURL(pending.url);
      if (els.sheet.open) els.sheet.close();
      await refreshShots();
      toast(clashes.length ? "Sudut itu diperbarui" : "Sudut tersimpan");
    } catch (error) {
      toast(error?.name === "QuotaExceededError" ? "Penyimpanan HP penuh." : "Sudut gagal disimpan.");
    }
  }

  async function imageFileToBlob(file) {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(2, Math.round(bitmap.width * scale));
    const height = Math.max(2, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d", { alpha: false }).drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) throw new Error("encode");
    return { blob, width, height };
  }

  function seek(video, time) {
    return new Promise((resolve, reject) => {
      if (video.readyState >= 2 && Math.abs(video.currentTime - time) < 0.02) {
        resolve();
        return;
      }
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error("seek"));
      }, 8000);
      const onSeeked = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("seek"));
      };
      function cleanup() {
        window.clearTimeout(timer);
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
      }
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("error", onError);
      video.currentTime = Math.min(Math.max(time, 0), Math.max(video.duration - 0.05, 0));
    });
  }

  async function framesFromVideo(file, onProgress) {
    if (file.size > 100 * 1024 * 1024) throw new Error("Besar video maksimal 100 MB.");
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("playsinline", "");
    video.style.cssText = "position:fixed;left:-9999px;width:4px;height:4px;opacity:0;pointer-events:none";
    document.body.append(video);
    video.src = url;
    try {
      await new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("Video tidak bisa dibaca.")), 12000);
        video.onloadeddata = () => {
          window.clearTimeout(timer);
          resolve();
        };
        video.onerror = () => {
          window.clearTimeout(timer);
          reject(new Error("Video tidak bisa dibaca."));
        };
      });
      if (!Number.isFinite(video.duration) || video.duration < 0.4) {
        throw new Error("Video terlalu pendek untuk satu putaran.");
      }
      if (video.duration > 90) throw new Error("Video maksimal 90 detik.");
      const scale = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(2, Math.round(video.videoWidth * scale));
      const height = Math.max(2, Math.round(video.videoHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      const frames = [];
      for (let index = 0; index < VIDEO_FRAMES; index += 1) {
        const time = ((index + 0.5) / VIDEO_FRAMES) * Math.max(video.duration - 0.08, 0.1);
        await seek(video, time);
        context.drawImage(video, 0, 0, width, height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84));
        if (!blob) throw new Error("encode");
        frames.push({ blob, width, height });
        onProgress(index + 1, VIDEO_FRAMES);
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
      return frames;
    } finally {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      URL.revokeObjectURL(url);
    }
  }

  function isVideoFile(file) {
    return file.type.startsWith("video") || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
  }

  function isImageFile(file) {
    return file.type.startsWith("image") || /\.(jpe?g|png|webp|gif|heic|heif|bmp|avif)$/i.test(file.name);
  }

  async function ingestFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    const video = files.find(isVideoFile);
    const images = files.filter(isImageFile);
    try {
      if (video) {
        if (images.length) toast("Video putaran yang dipakai. Foto yang ikut terpilih dilewati.");
        await ingestVideo(video);
        return;
      }
      if (!images.length) {
        toast("Pilih foto atau video.");
        return;
      }
      if (images.length === 1) {
        const prepared = await imageFileToBlob(images[0]);
        const url = URL.createObjectURL(prepared.blob);
        openPreview({ ...prepared, url, angle: state.presetAngle, ownsUrl: true });
        return;
      }
      await saveBatch(images.slice(0, VIDEO_FRAMES));
    } catch (error) {
      toastError(error, "Foto gagal dibaca. Coba JPG atau PNG.");
    }
  }

  async function saveBatch(files) {
    await ensureSession();
    if (state.shots.length) {
      const replace = window.confirm("Rangkaian foto ini mengganti sudut yang sudah ada di sesi ini?");
      if (!replace) return;
      for (const shot of state.shots) await store.deleteShot(shot.id);
      state.shots = [];
    }
    const room = MAX_SHOTS - state.shots.length;
    const chosen = files.slice(0, room);
    if (!chosen.length) {
      toast(`Maksimal ${MAX_SHOTS} sudut per sesi.`);
      return;
    }
    const prepared = [];
    for (const file of chosen) prepared.push(await imageFileToBlob(file));
    const shots = prepared.map((item, index) => ({
      id: crypto.randomUUID(),
      sessionId: state.sessionId,
      angle: (index / prepared.length) * 360,
      blob: item.blob,
      width: item.width,
      height: item.height,
      createdAt: Date.now(),
    }));
    await store.putShots(shots);
    await touchSession();
    state.mode = "mine";
    state.yaw = 0;
    state.spinning = false;
    els.sheet.close();
    await refreshShots();
    toast(`${shots.length} sudut dipasang mengelilingi tubuh`);
  }

  async function ingestVideo(file) {
    if (state.shots.length) {
      const replace = window.confirm("Video ini mengganti sudut yang sudah tersimpan di sesi ini?");
      if (!replace) return;
    }
    openSheet("busy");
    els.busyText.textContent = "Membaca video…";
    els.busyBar.style.width = "0%";
    try {
      const frames = await framesFromVideo(file, (done, total) => {
        els.busyText.textContent = `Mengambil sudut ${done} dari ${total}`;
        els.busyBar.style.width = `${Math.round((done / total) * 100)}%`;
      });
      await ensureSession();
      for (const shot of state.shots) await store.deleteShot(shot.id);
      const shots = frames.map((frame, index) => ({
        id: crypto.randomUUID(),
        sessionId: state.sessionId,
        angle: (index / frames.length) * 360,
        blob: frame.blob,
        width: frame.width,
        height: frame.height,
        createdAt: Date.now(),
      }));
      await store.putShots(shots);
      await touchSession();
      state.mode = "mine";
      state.yaw = 0;
      state.spinning = !reducedMotion;
      els.sheet.close();
      await refreshShots();
      toast("Putaran video tersusun 360°");
    } catch (error) {
      if (els.sheet.open) els.sheet.close();
      toastError(error, "Video gagal diubah jadi sudut.");
    }
  }

  async function removeActive() {
    const shot = nearest(state.shots, state.yaw);
    if (!shot) return;
    await store.deleteShot(shot.id);
    await touchSession();
    await refreshShots();
    toast("Sudut dihapus");
  }

  function preloadDemo() {
    let done = 0;
    return Promise.all(
      state.demo.map(
        (shot) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = image.onerror = () => {
              done += 1;
              resolve();
            };
            image.src = shot.url;
          }),
      ),
    ).then(() => done);
  }

  function bind() {
    els.tabDemo.addEventListener("click", () => {
      state.mode = "demo";
      state.spinning = false;
      renderChrome();
    });
    els.tabMine.addEventListener("click", () => {
      if (state.mode === "mine") return;
      state.mode = "mine";
      state.spinning = false;
      renderChrome();
    });
    els.source.addEventListener("click", () => {
      if (state.mode === "mine") openSheet("sessions");
      else openSheet("help");
    });
    els.help.addEventListener("click", () => openSheet("help"));
    els.spin.addEventListener("click", () => {
      if (els.spin.disabled) return;
      spinTouched = true;
      state.spinning = !state.spinning;
      state.settle = null;
      state.gliding = false;
      dismissHint();
      renderSpin();
    });
    els.add.addEventListener("click", () => {
      state.presetAngle = state.mode === "mine" ? firstGap() : 0;
      openSheet("add");
    });
    els.emptyAdd.addEventListener("click", () => {
      state.presetAngle = firstGap();
      openSheet("add");
    });
    els.sessions.addEventListener("click", () => openSheet("sessions"));
    els.edit.addEventListener("click", () => {
      const shot = nearest(state.shots, state.yaw);
      if (!shot) return;
      openPreview({
        url: shot.url,
        blob: shot.blob,
        width: shot.width,
        height: shot.height,
        angle: shot.angle,
        editingId: shot.id,
        ownsUrl: false,
      });
    });
    els.remove.addEventListener("click", () => {
      const shot = nearest(state.shots, state.yaw);
      if (!shot) return;
      if (window.confirm(`Hapus sudut ${zoneAt(shot.angle).name}?`)) removeActive();
    });
    els.presets.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      state.presetAngle = Number(button.dataset.angle);
      renderPresets();
    });
    els.camera.addEventListener("click", () => els.pickCamera.click());
    els.library.addEventListener("click", () => els.pickLibrary.click());
    els.pickCamera.addEventListener("change", () => {
      const files = [...els.pickCamera.files];
      els.pickCamera.value = "";
      ingestFiles(files);
    });
    els.pickLibrary.addEventListener("change", () => {
      const files = [...els.pickLibrary.files];
      els.pickLibrary.value = "";
      ingestFiles(files);
    });
    els.previewRange.addEventListener("input", () => setPreviewAngle(Number(els.previewRange.value)));
    els.previewCancel.addEventListener("click", () => {
      revokePending();
      els.sheet.close();
    });
    els.previewSave.addEventListener("click", () => savePending());
    els.sessionTitle.addEventListener("change", async () => {
      const session = currentSession();
      if (!session) return;
      session.title = els.sessionTitle.value.trim().slice(0, 40) || defaultTitle();
      els.sessionTitle.value = session.title;
      session.updatedAt = Date.now();
      await store.putSession(session);
      renderChrome();
      renderSessions();
    });
    els.newSession.addEventListener("click", async () => {
      const session = {
        id: crypto.randomUUID(),
        title: defaultTitle(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await store.putSession(session);
      state.sessions.unshift(session);
      await activateSession(session.id);
      toast("Sesi baru siap diisi");
    });
    els.deleteSession.addEventListener("click", async () => {
      const session = currentSession();
      if (!session) return;
      if (!window.confirm(`Hapus sesi ${session.title} beserta fotonya?`)) return;
      await store.deleteSession(session.id);
      state.sessions = state.sessions.filter((item) => item.id !== session.id);
      const next = state.sessions[0]?.id || null;
      if (next) await activateSession(next);
      else {
        state.sessionId = null;
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch (error) {
          /* ignore */
        }
        await refreshShots();
        renderSessions();
      }
      toast("Sesi dihapus");
    });
    els.sheet.addEventListener("click", (event) => {
      if (event.target === els.sheet) els.sheet.close();
    });
    els.sheet.addEventListener("close", () => {
      revokePending();
    });
    for (const button of els.sheet.querySelectorAll("[data-close]")) {
      button.addEventListener("click", () => els.sheet.close());
    }
    bindPointer(els.stage, "stage");
    bindPointer(els.ring, "ring");
    window.addEventListener("keydown", (event) => {
      if (event.target.matches("input, textarea")) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        spinTouched = true;
        stepShot(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        spinTouched = true;
        stepShot(-1);
      } else if (event.key === " " && !event.target.closest("button")) {
        event.preventDefault();
        els.spin.click();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.spinning) {
        state.spinning = false;
        renderSpin();
      }
    });
  }

  let lastTs = performance.now();
  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    step(dt);
    requestAnimationFrame(loop);
  }

  async function boot() {
    drawTicks();
    bind();
    try {
      if (localStorage.getItem(HINT_KEY) === "1") els.hint.classList.add("dim");
    } catch (error) {
      /* ignore */
    }
    await store.init();
    if (store.memory) toast("Penyimpanan HP tidak tersedia. Foto hilang kalau halaman ditutup.");
    try {
      state.sessions = await store.listSessions();
      const saved = localStorage.getItem(SESSION_KEY);
      state.sessionId = state.sessions.some((session) => session.id === saved)
        ? saved
        : state.sessions[0]?.id || null;
      if (state.sessionId) state.shots = await store.getShots(state.sessionId);
    } catch (error) {
      state.sessions = [];
      state.shots = [];
    }
    for (const shot of state.shots) {
      shot.url = URL.createObjectURL(shot.blob);
      state.urls.push(shot.url);
    }
    renderChrome();
    requestAnimationFrame(loop);
    const loaded = await preloadDemo();
    if (
      !reducedMotion &&
      !spinTouched &&
      loaded >= DEMO_COUNT - 2 &&
      state.mode === "demo" &&
      !state.pointer
    ) {
      state.spinning = true;
      renderSpin();
      window.setTimeout(dismissHint, 1600);
    }
  }

  boot();
})();
