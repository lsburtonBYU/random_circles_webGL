import { createAttribute, drawCanvas } from "./wegl-utils.js";

/** Call {@link drawCanvas} as soon as the DOM is loaded and parsed */
document.addEventListener("DOMContentLoaded", () => {
  //
  // Set up buffer data and associated attributes
  //
  // prettier-ignore
  const bufferData = new Float32Array([
    // X, Y,       R, G, B
      0.0,  0.8,   1.0, 1.0, 0.0, 
     -0.8, -0.8,   0.7, 0.0, 1.0, 
      0.8, -0.8,   0.1, 1.0, 0.6,
  ]);

  const attributes = new Array(
    // vertPosition is 2 elements in a 5 element vertex
    createAttribute("vertPosition", 2, 5, "float"),

    // vertColor is 3 elements in a 5 element vertex beginning at offset [2]
    createAttribute("vertColor", 3, 5, "float", 2)
  );

  drawCanvas(document.querySelector("#mainCanvas"), bufferData, attributes);
});
