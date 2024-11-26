import BaseModule from "./BaseModule.js";

export default class SlicerModule extends BaseModule {
  constructor(context, id, x, y) {
    super(context, id, x, y);
    this.title = "Slicer";
    this.type = "slicer";
    this.height = 280;

    // Create audio nodes
    this.audioNode = this.audioContext.createGain();
    this.gainNode = this.audioContext.createGain();
    this.audioNode.connect(this.gainNode);

    // Set up inputs and outputs
    this.inputs = ["audio"];
    this.outputs = ["audio"];

    // Initialize step sequencer
    this.steps = 8;
    this.currentStep = 0;
    this.sequence = Array(this.steps).fill(1); // 1 = on, 0 = off
    this.isPlaying = false;
    this.bpm = 120;
    this.stepInterval = null;

    // Create controls
    this.controls = [
      {
        type: "slider",
        min: 30,
        max: 300,
        value: this.bpm,
        step: 1,
        label: "Rate (BPM)",
        onChange: (value) => {
          this.bpm = value;
          if (this.isPlaying) {
            this.restartSequence();
          }
        },
      },
      {
        type: "slider",
        min: 0,
        max: 1,
        value: 1,
        step: 0.01,
        label: "Depth",
        onChange: (value) => {
          this.depth = value;
        },
      },
    ];

    this.depth = 1;
  }

  createDOM() {
    const element = super.createDOM();

    // Add step sequencer grid
    const grid = document.createElement("div");
    grid.className = "slicer-grid";

    for (let i = 0; i < this.steps; i++) {
      const step = document.createElement("div");
      step.className = "slicer-step";
      if (this.sequence[i]) {
        step.classList.add("active");
      }

      step.addEventListener("click", () => {
        this.sequence[i] = this.sequence[i] ? 0 : 1;
        step.classList.toggle("active");
      });

      grid.appendChild(step);
    }

    // Add play button
    const playButton = document.createElement("button");
    playButton.className = "slicer-play-button";
    playButton.textContent = "Play";
    playButton.addEventListener("click", () => {
      if (this.isPlaying) {
        this.stop();
        playButton.textContent = "Play";
      } else {
        if (this.audioContext.state === "running") {
          this.start();
          playButton.textContent = "Stop";
        }
      }
    });

    element.appendChild(playButton);
    element.appendChild(grid);
    return element;
  }

  start() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.currentStep = 0;
      this.scheduleSteps();
    }
  }

  stop() {
    if (this.isPlaying) {
      this.isPlaying = false;
      if (this.stepInterval) {
        clearInterval(this.stepInterval);
      }
      this.gainNode.gain.setValueAtTime(1, this.audioContext.currentTime);

      // Clear visual feedback
      const steps = this.element.querySelectorAll(".slicer-step");
      steps.forEach((step) => step.classList.remove("playing"));
    }
  }

  scheduleSteps() {
    const stepTime = ((60 / this.bpm) * 1000) / 2; // Sixteenth notes

    this.stepInterval = setInterval(() => {
      // Update visual feedback
      const steps = this.element.querySelectorAll(".slicer-step");
      steps.forEach((step) => step.classList.remove("playing"));
      steps[this.currentStep].classList.add("playing");

      // Set gain based on step value
      const targetGain = this.sequence[this.currentStep] ? 1 : 1 - this.depth;
      this.gainNode.gain.setValueAtTime(
        targetGain,
        this.audioContext.currentTime
      );

      // Move to next step
      this.currentStep = (this.currentStep + 1) % this.steps;
    }, stepTime);
  }

  restartSequence() {
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  connect(destModule) {
    if (destModule.audioNode) {
      this.gainNode.connect(destModule.audioNode);
    }
  }

  disconnect(destModule) {
    if (destModule.audioNode) {
      try {
        this.gainNode.disconnect(destModule.audioNode);
      } catch (e) {
        console.log("Already disconnected");
      }
    }
  }
}
