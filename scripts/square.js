const NUM_METABALLS = 12;

/**
 * Creates and compiles a shader from GLSL source code
 *
 * @param {!WebGLRenderingContext } gl The current WebGL rendering context
 * @param {!string} shaderSource The shader source code text in GLSL
 * @param {!number} shaderType The type of shader to create, either gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @throws {Error} If shader cannot be compiled
 * @returns {!WebGLShader} The compiled shader
 */
function makeShader(gl, shaderSource, shaderType) {
  const shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // gl.deleteShader(shader);
    throw new Error(
      `ERROR compiling ${
        shaderType === gl.VERTEX_SHADER ? "vertex" : "fragment"
      } shader: ${gl.getShaderInfoLog(shader)}`
    );
  }
  return shader;
}

/**
 * Creates a WebGLProgram, attaches a vertex and a fragment shader, then links
 * the program, with the option to validate the program.
 *
 * @param {!WebGLRenderingContext } gl The current WebGL rendering context
 * @param {!WebGLShader} vertexShader A compiled vertex shader
 * @param {!WebGLShader} fragmentShader A compiled fragment shader
 * @param {boolean} validate If true, will validate the program before returning it
 * @throws {Error} If program can't be linked
 * @throws {Error} If validate is true and the program can't be validated
 * @returns {!WebGLProgram}
 */
function makeProgram(gl, vertexShader, fragmentShader, validate = false) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error("ERROR linking program: " + gl.getProgramInfoLog(program));
  }
  if (validate) {
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
      throw new Error(
        "ERROR validating program: " + gl.getProgramInfoLog(program)
      );
    }
  }

  return program;
}

/**
 * Creates a program from 2 script tags.
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string[]} shaderCode Array of GLSL code for the shaders. The first is assumed to be the
 *        vertex shader, the second the fragment shader.
 * @return {!WebGLProgram} A program
 */
function makeProgramFromStrings(gl, shaderCode) {
  const vertexShader = makeShader(gl, shaderCode[0], gl.VERTEX_SHADER);

  const fragmentShader = makeShader(gl, shaderCode[1], gl.FRAGMENT_SHADER);

  return makeProgram(gl, vertexShader, fragmentShader);
}

/**
 * Creates a program from 2 script tags.
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string[]} shaderIds Array of ids names (no # prefix) of the script
 *        tags for the shaders. The first is assumed to be the
 *        vertex shader, the second the fragment shader.
 * @return {!WebGLProgram} A program
 */
function makeProgramFromScripts(gl, shaderIds) {
  const vertexShader = makeShader(
    gl,
    document.querySelector(`#${shaderIds[0]}`).textContent,
    gl.VERTEX_SHADER
  );

  const fragmentShader = makeShader(
    gl,
    document.querySelector(`#${shaderIds[1]}`).textContent,
    gl.FRAGMENT_SHADER
  );

  return makeProgram(gl, vertexShader, fragmentShader);
}

/**
 * Description of color object for WebGL color
 *
 * @typedef {object} ColorObject
 * @property {number} red Value of red from 0.0 to 1.0
 * @property {number} green Value of green from 0.0 to 1.0
 * @property {number} blue Value of blue from 0.0 to 1.0
 * @property {number} alpha Value of alpha from 0.0 to 1.0
 */

/**
 * Description of attribute object
 *
 * @typedef {object} AttributeObject
 * @property {string} name the name of the attribute to be used in the GLSL code
 * @property {number} size the number of elements for this attribute; must be 1,2,3, or 4
 * @property {number} stride the size in bytes of one full vertex
 * @property {number} offset the offset in bytes of this attribute in the full vertex
 * @property {number} type Data type of each component: gl.BYTE, gl.SHORT, gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT, gl.FLOAT
 * @property {boolean} normalized If true, integer data values normalized when being cast to a float
 */

/**
 * Creates an attribute object from the parameters
 *
 * @param {string} name The attribute (variable) name that will be accessed in the GLSL code
 * @param {number} numElements The number of elements for this attribute. Must be 1, 2, 3, or 4.
 * @param {number} numVertex  Number elements in the full vertex
 * @param {string} type Data type of each component: gl.BYTE, gl.SHORT, gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT, gl.FLOAT
 * @param {number} offset  Offset of this attribute in the full vertex
 * @param {number} typeSize size of the data type
 * @param {boolean} normalized If true, integer data values normalized when being cast to a float
 * @returns {AttributeObject} An attribute object used in the {@link createBuffer} to set the attribute pointed
 */
function createAttribute(
  name,
  numElements,
  numVertex,
  type,
  offset = 0,
  typeSize = Float32Array.BYTES_PER_ELEMENT,
  normalized = false
) {
  return {
    name: name,
    size: numElements,
    stride: numVertex * typeSize,
    offset: offset * typeSize,
    type: type,
    normalized: normalized,
  };
}

/**
 * Create a buffer from the buffer data and configure attributes
 *
 * @param {!WebGLRenderingContext } gl The current WebGL rendering context
 * @param {!WebGLProgram} program The WebGL complied and linked program
 * @param {!Float32Array} bufferData An array of elements
 * @param {!Array<AttributeObject>} attributes Attribute descriptions generated from {@link createAttribute}
 * @param {number} type Buffer type from a GLenum; default is gl.ARRAY_BUFFER
 * @param {number} bufferDataType Buffer data type from a GLenum; default is gl.STATIC_DRAW
 */
function createBuffer(
  gl,
  program,
  bufferData,
  attributes,
  type = gl.ARRAY_BUFFER,
  bufferDataType = gl.STATIC_DRAW
) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(type, buffer);
  gl.bufferData(type, bufferData, bufferDataType);

  attributes.forEach((attr) => {
    const attrLocation = gl.getAttribLocation(program, attr.name);
    if (attrLocation === -1) {
      throw "Can not find attribute " + attr.name + ".";
    }

    gl.vertexAttribPointer(
      attrLocation,
      attr.size,
      attr.type,
      attr.normalized,
      attr.stride,
      attr.offset
    );
    gl.enableVertexAttribArray(attrLocation);
  });
}

function clearCanvas(gl, color) {
  gl.clearColor(color.r, color.g, color.b, color.a);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

/**
 * Given a canvas element, uses WebGL to draw objects on it
 * @param {!WebGLRenderingContext} gl The current WebGL rendering context
 * @param {Float32Array} bufferData The data to transfer to the buffer
 * @param {string[]} shaderText Array script code for the shaders. The first is assumed to be the
 * @param {Array<AttributeObject>} attributes An array of attribute info for the buffer data.
 *        vertex shader, the second the fragment shader. Default IDs are vertexShader
 *        and fragmentShader
 * @param {ColorObject} clearColor The rgba color (values 0.0 to 1.0) to clear the canvas to; default is transparent 0,0,0
 * @throws {Error} if browser does not support WebGL
 */
function drawCanvas(
  gl,
  bufferData = null,
  shaderText,
  attributes = [],
  clearColor = { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }
) {
  const WIDTH = gl.canvas.width;
  const HEIGHT = gl.canvas.height;

  const program = makeProgramFromStrings(gl, shaderText);

  //
  // Create buffer from buffer data and attributes
  //
  createBuffer(gl, program, bufferData, attributes);

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, WIDTH, HEIGHT);
  // clearCanvas(gl, clearColor);

  gl.useProgram(program);

  // generate metaballs
  const metaballs = [];

  const MAX_RADIUS = 80;
  const MIN_RADIUS = 6;

  for (let i = 0; i < NUM_METABALLS; i++) {
    const radius = Math.random() * (MAX_RADIUS - MIN_RADIUS) + MIN_RADIUS;
    const x = Math.random() * (WIDTH - 2 * radius) + radius;
    const y = Math.random() * (HEIGHT - 2 * radius) + radius;
    console.log(`metaballs[${i}]: (${x}, ${y}), radius: ${radius.toFixed(1)}`);
    metaballs.push({
      x: x,
      y: y,
      r: radius,
    });
  }

  const dataToSendToGPU = new Float32Array(3 * NUM_METABALLS);
  for (let i = 0; i < NUM_METABALLS; i++) {
    var baseIndex = 3 * i;
    let mb = metaballs[i];
    dataToSendToGPU[baseIndex + 0] = mb.x;
    dataToSendToGPU[baseIndex + 1] = mb.y;
    dataToSendToGPU[baseIndex + 2] = mb.r;
  }

  let uniformLocation = gl.getUniformLocation(program, "metaballs");
  gl.uniform3fv(uniformLocation, dataToSendToGPU);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

/** Call {@link drawCanvas} as soon as the DOM is loaded and parsed */
document.addEventListener("DOMContentLoaded", () => {
  canvas = document.querySelector("#mainCanvas");
  canvas.width = 500;
  canvas.height = 400;

  const gl = canvas.getContext("webgl");

  if (!gl) {
    throw new Error("ERROR: browser does not support WebGL");
  }

  const vertexCode = `   
    precision mediump float;     
    attribute vec2 vertPosition;
    
    void main()
    {
      gl_Position = vec4(vertPosition, 0.0, 1.0);
    }`;

  const fragmentCode = `  
    precision mediump float;   
    const int num = ${NUM_METABALLS};
    uniform vec3 metaballs[num];

   
    void main()
    {
      float x = gl_FragCoord.x;
      float y = gl_FragCoord.y;

      for (int i = 0; i < num; i++) {
        vec3 mb = metaballs[i];
        float dx = mb.x - x;
        float dy = mb.y - y;
        float r = mb.z;
        if (dx*dx + dy*dy < r*r) {
          gl_FragColor = vec4(x/500.0, y/400.0, 0.5, 1.0);   
          return;
        }
      }
      gl_FragColor = vec4(0.9, 0.9, 0.9, 1.0);  
    }`;
  //
  // Set up buffer data and associated attributes
  //
  // prettier-ignore
  const bufferData = new Float32Array([
    // X, Y,       R, G, B
      -1.0,  1.0,  // top left 1.0, 1.0, 0.0, 
      -1.0, -1.0,  // bottom left 0.7, 0.0, 1.0, 
       1.0,  1.0,  // top right 0.1, 1.0, 0.6,
       1.0, -1.0,  // bottom right 1.0, 0.0, 0.0, 
  ]);

  const attributes = new Array(
    // vertPosition is 2 elements in a 2 element vertex of type float
    createAttribute("vertPosition", 2, 2, gl.FLOAT)

    // vertColor is 3 elements in a 5 element vertex beginning at offset [2]
    // createAttribute("vertColor", 3, 5, "float", 2)
  );

  //TODO: send uniforms here
  drawCanvas(gl, bufferData, new Array(vertexCode, fragmentCode), attributes);
});
