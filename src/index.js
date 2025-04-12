import { Tooltip } from "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/+esm";
import imageCompareViewer from "https://cdn.jsdelivr.net/npm/image-compare-viewer@1.6.2/+esm";

function loadConfig() {
  if (localStorage.getItem("darkMode") == 1) {
    document.documentElement.setAttribute("data-bs-theme", "dark");
  }
}

function toggleDarkMode() {
  if (localStorage.getItem("darkMode") == 1) {
    localStorage.setItem("darkMode", 0);
    document.documentElement.setAttribute("data-bs-theme", "light");
  } else {
    localStorage.setItem("darkMode", 1);
    document.documentElement.setAttribute("data-bs-theme", "dark");
  }
}

function initLangSelect() {
  const langSelect = document.getElementById("lang");
  langSelect.onchange = () => {
    const lang = langSelect.options[langSelect.selectedIndex].value;
    location.href = `/cv-npr/${lang}/`;
  };
}

function initTooltip() {
  for (const node of document.querySelectorAll('[data-bs-toggle="tooltip"]')) {
    const tooltip = new Tooltip(node);
    node.addEventListener("touchstart", () => tooltip.show());
    node.addEventListener("touchend", () => tooltip.hide());
    node.addEventListener("click", () => {
      if (!tooltip.tip) return;
      tooltip.tip.classList.add("d-none");
      tooltip.hide();
      tooltip.tip.classList.remove("d-none");
    });
  }
}

async function getOpenCVPath() {
  const simdSupport = await wasmFeatureDetect.simd();
  const threadsSupport = self.crossOriginIsolated &&
    await wasmFeatureDetect.threads();
  if (simdSupport && threadsSupport) {
    return "/cv-npr/opencv/threaded-simd/opencv_js.js";
  } else if (simdSupport) {
    return "/cv-npr/opencv/simd/opencv_js.js";
  } else if (threadsSupport) {
    return "/cv-npr/opencv/threads/opencv_js.js";
  } else {
    return "/cv-npr/opencv/wasm/opencv_js.js";
  }
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    script.src = url;
    document.body.appendChild(script);
  });
}

function getTransparentBackgroundImage(size, colors) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.fillStyle = colors[0];
  context.fillRect(0, 0, size / 2, size / 2);
  context.fillRect(size / 2, size / 2, size / 2, size / 2);
  context.fillStyle = colors[1];
  context.fillRect(size / 2, 0, size / 2, size / 2);
  context.fillRect(0, size / 2, size / 2, size / 2);
  const url = canvas.toDataURL("image/png");
  return `url(${url})`;
}

function setTransparentCSSVariables() {
  const lightBg = getTransparentBackgroundImage(32, ["#ddd", "#fff"]);
  const darkBg = getTransparentBackgroundImage(32, ["#333", "#212529"]);
  document.documentElement.style.setProperty(
    "--transparent-bg-light",
    lightBg,
  );
  document.documentElement.style.setProperty(
    "--transparent-bg-dark",
    darkBg,
  );
}

class Panel {
  constructor(panel) {
    this.panel = panel;
  }

  show() {
    this.panel.classList.remove("d-none");
  }

  hide() {
    this.panel.classList.add("d-none");
  }

  getActualRect(canvas) {
    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;
    const naturalWidth = canvas.width;
    const naturalHeight = canvas.height;
    const aspectRatio = naturalWidth / naturalHeight;
    let width, height, top, left, right, bottom;
    if (canvasWidth / canvasHeight > aspectRatio) {
      width = canvasHeight * aspectRatio;
      height = canvasHeight;
      top = 0;
      left = (canvasWidth - width) / 2;
      right = left + width;
      bottom = canvasHeight;
    } else {
      width = canvasWidth;
      height = canvasWidth / aspectRatio;
      top = (canvasHeight - height) / 2;
      left = 0;
      right = canvasWidth;
      bottom = top + height;
    }
    return { width, height, top, left, right, bottom };
  }
}

class LoadPanel extends Panel {
  constructor(panel) {
    super(panel);

    for (const node of document.querySelectorAll(".image-compare")) {
      const images = node.querySelectorAll("img");
      images[0].classList.remove("w-100");
      new imageCompareViewer(node, { addCircle: true }).mount();
      images[1].classList.remove("d-none");
    }
    const clipboardButton = panel.querySelector(".clipboard");
    if (clipboardButton) {
      clipboardButton.onclick = (event) => {
        this.loadClipboardImage(event);
      };
    }
    panel.querySelector(".selectImage").onclick = () => {
      panel.querySelector(".inputImage").click();
    };
    panel.querySelector(".inputImage").onchange = (event) => {
      this.loadInputImage(event);
    };
    const examples = panel.querySelector(".examples");
    if (examples) {
      for (const img of examples.querySelectorAll("img")) {
        img.onclick = () => {
          const url = img.src.replace("-64", "");
          this.loadImage(url);
        };
      }
    }
  }

  show() {
    super.show();
    document.body.scrollIntoView({ behavior: "instant" });
  }

  executeCamera() {
    this.hide();
    cameraPanel.show();
    cameraPanel.executeVideo();
  }

  handleImageOnloadEvent = (event) => {
    const img = event.currentTarget;
    filterPanel.setCanvas(img);
    const filter = filterPanel.currentFilter;
    filterPanel.canvas.classList.add("loading");
    setTimeout(() => {
      filter.apply();
      filterPanel.canvas.classList.remove("loading");
    }, 0);
  };

  loadImage(url) {
    this.hide();
    filterPanel.show();
    const img = new Image();
    img.onload = (event) => this.handleImageOnloadEvent(event);
    img.src = url;
  }

  loadInputImage(event) {
    const file = event.currentTarget.files[0];
    this.loadFile(file);
    event.currentTarget.value = "";
  }

  loadFile(file) {
    if (!file.type.startsWith("image/")) return;
    if (file.type === "image/svg+xml") {
      alert("SVG is not supported.");
      return;
    }
    const url = URL.createObjectURL(file);
    this.loadImage(url);
  }

  async loadClipboardImage() {
    try {
      const items = await navigator.clipboard.read();
      const item = items[0];
      for (const type of item.types) {
        if (type === "image/svg+xml") {
          alert("SVG is not supported.");
        } else if (type.startsWith("image/")) {
          const file = await item.getType(type);
          const url = URL.createObjectURL(file);
          this.loadImage(url);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
}

class FilterPanel extends LoadPanel {
  filters = {};
  currentFilter;

  constructor(panel) {
    super(panel);
    this.panelContainer = panel.querySelector(".panelContainer");
    this.selectedIndex = 0;
    this.canvas = panel.querySelector(".image");
    this.canvasContext = this.canvas.getContext("2d", {
      willReadFrequently: true,
    });
    this.originalCanvas = panel.querySelector(".originalImage");
    this.originalCanvasContext = this.originalCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    this.canvasContainer = this.canvas.parentNode;

    this.filterSelect = panel.querySelector(".filterSelect");
    this.filterSelect.onchange = () => this.filterSelectEvent();

    panel.querySelector(".moveTop").onclick = () => this.moveLoadPanel();
    panel.querySelector(".download").onclick = () => this.download();
    this.addFilters(panel);
  }

  toggleCanvas() {
    if (this.canvas.parentNode) {
      this.canvas.replaceWith(this.originalCanvas);
    } else {
      this.originalCanvas.replaceWith(this.canvas);
    }
  }

  resizeWell(target) {
    [this.frontWell, this.eraserWell, this.backWell].forEach((well) => {
      if (well === target) {
        well.style.width = "96px";
        well.style.height = "96px";
      } else {
        well.style.width = "64px";
        well.style.height = "64px";
      }
    });
  }

  updatePenSize(penSize) {
    this.paintPad.dotSize = penSize;
    this.paintPad.minWidth = penSize;
    this.paintPad.maxWidth = penSize;
    this.updateCursor(penSize, this.paintCanvas);
  }

  updateCursor(size, target) {
    const canvas = document.createElement("canvas");
    canvas.width = size * 2;
    canvas.height = size * 2;
    const context = canvas.getContext("2d");
    context.beginPath();
    context.arc(size, size, size, 0, Math.PI * 2);
    context.fillStyle = "rgba(255, 255, 255, 0.5)";
    context.fill();
    context.strokeStyle = "rgba(0, 0, 0, 0.5)";
    context.lineWidth = 1;
    context.stroke();
    const dataURL = canvas.toDataURL();
    target.style.cursor = `url(${dataURL}) ${size} ${size}, auto`;
  }

  getActualRect(canvas) {
    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;
    const naturalWidth = canvas.width;
    const naturalHeight = canvas.height;
    const aspectRatio = naturalWidth / naturalHeight;
    let width, height, top, left, right, bottom;
    if (canvasWidth / canvasHeight > aspectRatio) {
      width = canvasHeight * aspectRatio;
      height = canvasHeight;
      top = 0;
      left = (canvasWidth - width) / 2;
      right = left + width;
      bottom = canvasHeight;
    } else {
      width = canvasWidth;
      height = canvasWidth / aspectRatio;
      top = (canvasHeight - height) / 2;
      left = 0;
      right = canvasWidth;
      bottom = top + height;
    }
    return { width, height, top, left, right, bottom };
  }

  show() {
    super.show();
    this.panelContainer.scrollIntoView({ behavior: "instant" });
  }

  moveLoadPanel() {
    this.hide();
    loadPanel.show();
  }

  download() {
    this.canvas.toBlob((blob) => {
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = "npr.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  filterSelectEvent() {
    const options = this.filterSelect.options;
    const selectedIndex = options.selectedIndex;
    const prevClass = options[this.selectedIndex].value;
    const currClass = options[selectedIndex].value;
    this.panel.querySelector(`.${prevClass}`).classList.add("d-none");
    this.panel.querySelector(`.${currClass}`).classList.remove("d-none");
    this.selectedIndex = selectedIndex;
    const filter = this.filters[currClass];
    this.currentFilter = filter;
    this.canvas.classList.add("loading");
    setTimeout(() => {
      this.currentFilter.apply();
      this.canvas.classList.remove("loading");
    }, 0);
  }

  addFilters(panel) {
    this.filtering = false;
    this.addDetailEnhanceEvents(panel);
    this.addEdgePreservingFilterEvents(panel);
    this.addPencilSketchEvents(panel);
    this.addStylizationEvents(panel);
    this.addOilPaintingEvents(panel);
    this.addAnisotropicDiffusionEvents(panel);
    this.addApplyColorMapEvents(panel);
    this.addMosaicEvents(panel);
    this.currentFilter = this.filters.detailEnhance;
  }

  addInputEvents(filter) {
    for (const input of Object.values(filter.inputs)) {
      input.addEventListener("input", () => {
        this.canvas.classList.add("loading");
        setTimeout(() => {
          this.currentFilter.apply();
          this.canvas.classList.remove("loading");
        }, 0);
      });
    }
    for (const node of filter.root.querySelectorAll("button[title=reset]")) {
      node.onclick = () => {
        const rangeInput = node.previousElementSibling;
        rangeInput.value = rangeInput.dataset.value;
        rangeInput.dispatchEvent(new Event("input"));
      };
    }
  }

  addDetailEnhanceEvents(panel) {
    const root = panel.querySelector(".detailEnhance");
    this.filters.detailEnhance = {
      root,
      apply: () => this.detailEnhance(),
      inputs: {
        sigmaS: root.querySelector(".sigmaS"),
        sigmaR: root.querySelector(".sigmaR"),
      },
    };
    this.addInputEvents(this.filters.detailEnhance);
  }

  detailEnhance() {
    const filter = this.filters.detailEnhance;
    const sigmaS = Number(filter.inputs.sigmaS.value);
    if (sigmaS === 0) {
      this.canvasContext.drawImage(this.originalCanvas, 0, 0);
    } else {
      const sigmaR = Number(filter.inputs.sigmaR.value);
      const src = cv.imread(this.originalCanvas);
      cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
      cv.detailEnhance(src, src, sigmaS, sigmaR);
      cv.cvtColor(src, src, cv.COLOR_RGB2RGBA, 0);
      cv.imshow(this.canvas, src);
      src.delete();
    }
  }

  addEdgePreservingFilterEvents(panel) {
    const root = panel.querySelector(".edgePreservingFilter");
    this.filters.edgePreservingFilter = {
      root,
      apply: () => this.edgePreservingFilter(),
      inputs: {
        sigmaS: root.querySelector(".sigmaS"),
        sigmaR: root.querySelector(".sigmaR"),
      },
    };
    this.addInputEvents(this.filters.edgePreservingFilter);
  }

  edgePreservingFilter() {
    const filter = this.filters.edgePreservingFilter;
    const sigmaS = Number(filter.inputs.sigmaS.value);
    if (sigmaS === 0) {
      this.canvasContext.drawImage(this.originalCanvas, 0, 0);
    } else {
      const sigmaR = Number(filter.inputs.sigmaR.value);
      const src = cv.imread(this.originalCanvas);
      cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
      // cv.edgePreservingFilter(src, src, cv.NORMCONV_FILTER, sigmaS, sigmaR);
      cv.edgePreservingFilter(src, src, cv.RECURS_FILTER, sigmaS, sigmaR);
      cv.cvtColor(src, src, cv.COLOR_RGB2RGBA, 0);
      cv.imshow(this.canvas, src);
      src.delete();
    }
  }

  addPencilSketchEvents(panel) {
    const root = panel.querySelector(".pencilSketch");
    this.filters.pencilSketch = {
      root,
      apply: () => this.pencilSketch(),
      inputs: {
        sigmaS: root.querySelector(".sigmaS"),
        sigmaR: root.querySelector(".sigmaR"),
        shade: root.querySelector(".shade"),
      },
    };
    this.addInputEvents(this.filters.pencilSketch);
  }

  pencilSketch() {
    const filter = this.filters.pencilSketch;
    const sigmaS = Number(filter.inputs.sigmaS.value);
    if (sigmaS === 0) {
      this.canvasContext.drawImage(this.originalCanvas, 0, 0);
    } else {
      const dst = new cv.Mat();
      const sigmaR = Number(filter.inputs.sigmaR.value);
      const shade = Number(filter.inputs.shade.value);
      const src = cv.imread(this.originalCanvas);
      cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
      // cv.pencilSketch(src, src, dst, sigmaS, sigmaR, shade); // gray
      cv.pencilSketch(src, dst, src, sigmaS, sigmaR, shade); // color
      cv.cvtColor(src, src, cv.COLOR_RGB2RGBA, 0);
      cv.imshow(this.canvas, src);
      src.delete();
      dst.delete();
    }
  }

  addStylizationEvents(panel) {
    const root = panel.querySelector(".stylization");
    this.filters.stylization = {
      root,
      apply: () => this.stylization(),
      inputs: {
        sigmaS: root.querySelector(".sigmaS"),
        sigmaR: root.querySelector(".sigmaR"),
      },
    };
    this.addInputEvents(this.filters.stylization);
  }

  stylization() {
    const filter = this.filters.stylization;
    const sigmaS = Number(filter.inputs.sigmaS.value);
    if (sigmaS === 0) {
      this.canvasContext.drawImage(this.originalCanvas, 0, 0);
    } else {
      const sigmaR = Number(filter.inputs.sigmaR.value);
      const src = cv.imread(this.originalCanvas);
      cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
      cv.stylization(src, src, sigmaS, sigmaR);
      cv.cvtColor(src, src, cv.COLOR_RGB2RGBA, 0);
      cv.imshow(this.canvas, src);
      src.delete();
    }
  }

  addOilPaintingEvents(panel) {
    const root = panel.querySelector(".oilPainting");
    this.filters.oilPainting = {
      root,
      apply: () => this.oilPainting(),
      inputs: {
        size: root.querySelector(".size"),
        dynRatio: root.querySelector(".dynRatio"),
      },
    };
    this.addInputEvents(this.filters.oilPainting);
  }

  oilPainting() {
    const filter = this.filters.oilPainting;
    const dynRatio = Number(filter.inputs.dynRatio.value);
    if (dynRatio === 0) {
      this.canvasContext.drawImage(this.originalCanvas, 0, 0);
    } else {
      const size = Number(filter.inputs.size.value) * 2 + 1;
      const src = cv.imread(this.originalCanvas);
      cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
      cv.xphoto_oilPainting(src, src, size, dynRatio);
      cv.cvtColor(src, src, cv.COLOR_RGB2RGBA, 0);
      cv.imshow(this.canvas, src);
      src.delete();
    }
  }

  addAnisotropicDiffusionEvents(panel) {
    const root = panel.querySelector(".anisotropicDiffusion");
    this.filters.anisotropicDiffusion = {
      root,
      apply: () => this.anisotropicDiffusion(),
      inputs: {
        alpha: root.querySelector(".alpha"),
        K: root.querySelector(".K"),
        iterations: root.querySelector(".iterations"),
      },
    };
    this.addInputEvents(this.filters.anisotropicDiffusion);
  }

  anisotropicDiffusion() {
    const filter = this.filters.anisotropicDiffusion;
    const K = Number(filter.inputs.K.value);
    const alpha = Number(filter.inputs.alpha.value);
    const iterations = Number(filter.inputs.iterations.value);
    if (K === 0 || alpha === 0 || iterations === 0) {
      this.canvasContext.drawImage(this.originalCanvas, 0, 0);
    } else {
      const src = cv.imread(this.originalCanvas);
      cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
      cv.ximgproc_anisotropicDiffusion(src, src, alpha, K, iterations);
      cv.cvtColor(src, src, cv.COLOR_RGB2RGBA, 0);
      cv.imshow(this.canvas, src);
      src.delete();
    }
  }

  addApplyColorMapEvents(panel) {
    const root = panel.querySelector(".applyColorMap");
    this.filters.applyColorMap = {
      root,
      apply: () => this.applyColorMap(),
      inputs: {
        colormap: root.querySelector(".colormap"),
      },
    };
    this.addInputEvents(this.filters.applyColorMap);
  }

  applyColorMap() {
    const filter = this.filters.applyColorMap;
    const colormap = Number(filter.inputs.colormap.value);
    if (colormap === 0) {
      this.canvasContext.drawImage(this.originalCanvas, 0, 0);
    } else {
      const src = cv.imread(this.originalCanvas);
      cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
      cv.applyColorMap(src, src, colormap);
      cv.cvtColor(src, src, cv.COLOR_RGB2RGBA, 0);
      cv.imshow(this.canvas, src);
      src.delete();
    }
  }

  addMosaicEvents(panel) {
    const root = panel.querySelector(".mosaic");
    this.filters.mosaic = {
      root,
      apply: () => this.mosaic(),
      inputs: {
        dsize: root.querySelector(".dsize"),
      },
    };
    this.addInputEvents(this.filters.mosaic);
  }

  mosaic() {
    const filter = this.filters.mosaic;
    const dsize = Number(filter.inputs.dsize.value);
    if (dsize === 1) {
      this.canvasContext.drawImage(this.originalCanvas, 0, 0);
    } else {
      const src = cv.imread(this.originalCanvas);
      const w = src.cols;
      const h = src.rows;
      cv.resize(
        src,
        src,
        new cv.Size(w / dsize, h / dsize),
        0,
        0,
        cv.INTER_AREA,
      );
      cv.resize(src, src, new cv.Size(w, h), 0, 0, cv.INTER_NEAREST);
      cv.imshow(this.canvas, src);
      src.delete();
    }
  }

  setCanvas(canvas) {
    if (canvas.tagName.toLowerCase() === "img") {
      this.canvas.width = canvas.naturalWidth;
      this.canvas.height = canvas.naturalHeight;
      this.originalCanvas.width = canvas.naturalWidth;
      this.originalCanvas.height = canvas.naturalHeight;
    } else {
      this.canvas.width = canvas.width;
      this.canvas.height = canvas.height;
      this.originalCanvas.width = canvas.width;
      this.originalCanvas.height = canvas.height;
    }
    this.canvasContext.drawImage(canvas, 0, 0);
    this.originalCanvasContext.drawImage(canvas, 0, 0);
  }
}

loadConfig();
initLangSelect();
initTooltip();
setTransparentCSSVariables();
await loadScript(await getOpenCVPath());
cv = await cv();

const filterPanel = new FilterPanel(document.getElementById("filterPanel"));
const loadPanel = new LoadPanel(document.getElementById("loadPanel"));
document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
globalThis.ondragover = (event) => {
  event.preventDefault();
};
globalThis.ondrop = (event) => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  loadPanel.loadFile(file);
};
globalThis.addEventListener("paste", (event) => {
  const item = event.clipboardData.items[0];
  const file = item.getAsFile();
  if (!file) return;
  loadPanel.loadFile(file);
});
