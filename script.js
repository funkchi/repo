import { bandOfTheDay } from "./src/band.js";

document.querySelector("#lucky-button").addEventListener("click", () => {
  const button = document.querySelector("#lucky-button");
  const status = document.querySelector("#status");

  button.disabled = true;
  status.textContent = "Taking you somewhere good…";
  window.location.assign(bandOfTheDay());
});
