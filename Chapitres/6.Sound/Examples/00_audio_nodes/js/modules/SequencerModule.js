import BaseModule from "./BaseModule.js";

export default class SequencerModule extends BaseModule {
  constructor(audioContext, id, x, y) {
    super(audioContext, id, x, y);
    this.title = "Sequencer";
    this.outputs = ["trigger"];
    this.connectedKeyboards = new Set();

    this.steps = 8;
    this.currentStep = 0;
    this.isPlaying = false;
    this.bpm = 120;
    this.stepInterval = null;

    // Initialize sequence with empty notes
    this.sequence = Array(this.steps).fill(null);
  }

  createDOM() {
    const element = document.createElement("div");
    element.className = "audio-module module-sequencer";
    element.id = this.id;
    element.style.left = `${this.x}px`;
    element.style.top = `${this.y}px`;

    // Add title
    const title = document.createElement("div");
    title.className = "module-title";
    title.textContent = this.title;
    element.appendChild(title);

    // Add controls container
    const controls = document.createElement("div");
    controls.className = "sequencer-controls";

    // Add BPM control
    const bpmControl = document.createElement("div");
    bpmControl.className = "control-group";

    const bpmLabel = document.createElement("label");
    bpmLabel.textContent = "BPM";

    const bpmInput = document.createElement("input");
    bpmInput.type = "number";
    bpmInput.min = "30";
    bpmInput.max = "300";
    bpmInput.value = this.bpm;
    bpmInput.addEventListener("change", (e) => {
      this.bpm = parseInt(e.target.value);
      if (this.isPlaying) {
        this.stop();
        this.start();
      }
    });

    bpmControl.appendChild(bpmLabel);
    bpmControl.appendChild(bpmInput);
    controls.appendChild(bpmControl);

    // Add play/stop button
    const playButton = document.createElement("button");
    playButton.className = "sequencer-play-button";
    playButton.textContent = "Play";
    playButton.addEventListener("click", () => {
      if (this.isPlaying) {
        this.stop();
      } else {
        // Only start if the audio context is running
        if (this.audioContext.state === "running") {
          this.isPlaying = true;
          this.currentStep = 0;
          this.scheduleSteps();
          playButton.textContent = "Stop";
        }
      }
    });
    controls.appendChild(playButton);

    element.appendChild(controls);

    // Add sequencer grid
    const grid = document.createElement("div");
    grid.className = "sequencer-grid";

    for (let i = 0; i < this.steps; i++) {
      const step = document.createElement("div");
      step.className = "sequencer-step";

      // Add note display
      const noteDisplay = document.createElement("div");
      noteDisplay.className = "note-display";
      noteDisplay.textContent = "-";
      step.appendChild(noteDisplay);

      const noteSelect = document.createElement("select");
      noteSelect.className = "note-select";

      // Add empty option
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "-";
      noteSelect.appendChild(emptyOption);

      // Add note options
      const notes = [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B",
        "C5",
      ];
      notes.forEach((note) => {
        const option = document.createElement("option");
        option.value = note;
        option.textContent = note;
        noteSelect.appendChild(option);
      });

      noteSelect.addEventListener("change", (e) => {
        this.sequence[i] = e.target.value;
        // Update visual state when note changes
        if (e.target.value) {
          step.classList.add("has-note");
          noteDisplay.textContent = e.target.value;
        } else {
          step.classList.remove("has-note");
          noteDisplay.textContent = "-";
        }
      });

      step.appendChild(noteSelect);
      grid.appendChild(step);
    }

    element.appendChild(grid);

    // Add connection points
    const connectionPoints = document.createElement("div");
    connectionPoints.className = "connection-points";
    const outputPoint = document.createElement("div");
    outputPoint.className = "connection-point output";
    connectionPoints.appendChild(outputPoint);
    element.appendChild(connectionPoints);

    this.element = element;
    return element;
  }

  start() {
    // Don't start the sequencer automatically
    // Only handle audio context state
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  stop() {
    // Only stop if we're actually playing the sequence
    if (this.isPlaying) {
      this.isPlaying = false;
      if (this.stepInterval) {
        clearInterval(this.stepInterval);
      }
      // Clear active step highlighting
      const steps = this.element.querySelectorAll(".sequencer-step");
      steps.forEach((step) => step.classList.remove("active"));

      // Release any playing notes
      this.connectedKeyboards.forEach((keyboard) => {
        keyboard.handleInput("trigger", null);
      });

      // Update button text
      const playButton = this.element.querySelector(".sequencer-play-button");
      if (playButton) {
        playButton.textContent = "Play";
      }
    }
  }

  scheduleSteps() {
    const stepTime = (60 / this.bpm) * 1000;

    this.stepInterval = setInterval(() => {
      // Update visual feedback
      const steps = this.element.querySelectorAll(".sequencer-step");
      steps.forEach((step) => {
        step.classList.remove("active");
        step.classList.remove("playing");
      });

      steps[this.currentStep].classList.add("active");

      // First, send note-off for previous step
      const previousStep = (this.currentStep - 1 + this.steps) % this.steps;
      const previousNote = this.sequence[previousStep];
      if (previousNote) {
        this.connectedKeyboards.forEach((keyboard) => {
          keyboard.handleInput("trigger", null);
        });
        steps[previousStep].classList.remove("playing");
      }

      // Then, play the new note if one is set for this step
      const note = this.sequence[this.currentStep];
      if (note) {
        this.connectedKeyboards.forEach((keyboard) => {
          keyboard.handleInput("trigger", note);
        });
        steps[this.currentStep].classList.add("playing");
      }

      // Move to next step
      this.currentStep = (this.currentStep + 1) % this.steps;
    }, stepTime);
  }

  connect(module) {
    if (module.constructor.name === "KeyboardModule") {
      this.connectedKeyboards.add(module);
    }
  }

  disconnect(module) {
    if (module.constructor.name === "KeyboardModule") {
      this.connectedKeyboards.delete(module);
    }
  }
}
