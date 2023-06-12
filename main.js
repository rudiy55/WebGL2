'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let point; // variable to display a point on a surface
let plane; // variable to display a plane on the background
let userPointCoord; // the coordinate of a point on the texture
let userRotAngle; // texture rotation angle

let camera;
let textureVID, textureORIG, video, track;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.countText = 0;
    this.count = 0;

    this.BufferData = function (vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.TextureBufferData = function (points) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STREAM_DRAW);

        this.countText = points.length / 2;
    }
    // Draw the surface
    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexture);


        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
    // Draw a point on the surface
    this.DrawPoint = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}

// Function to create point geometry
function CreateSphereSurface(r = 0.1) {
    let vertexList = [];
    let lon = -Math.PI;
    let lat = -Math.PI * 0.5;
    while (lon < Math.PI) {
        while (lat < Math.PI * 0.5) {
            let v1 = sphereSurfaceDate(r, lon, lat);
            vertexList.push(v1.x, v1.y, v1.z);
            lat += 0.05;
        }
        lat = -Math.PI * 0.5
        lon += 0.05;
    }
    return vertexList;
}

function sphereSurfaceDate(r, u, v) {
    let x = r * Math.sin(u) * Math.cos(v);
    let y = r * Math.sin(u) * Math.sin(v);
    let z = r * Math.cos(u);
    return { x: x, y: y, z: z };
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribTexture = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;
    // Variables to pass to the shader
    this.iUserPoint = -1;
    this.irotAngle = 0;
    this.iUP = -1;
    this.iTMU = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */

function _draw() {
    draw();
    window.requestAnimationFrame(_draw);
}
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    readValues();
    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();
    let noRotationView = m4.identity();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);


    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let matAccum2 = m4.multiply(rotateToPointZero, noRotationView);
    let matAccum3 = m4.multiply(translateToPointZero, matAccum2);
    let modelViewProjection = m4.multiply(projection, matAccum3);

    gl.bindTexture(gl.TEXTURE_2D, textureVID);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(m4.translation(-2, -2, 0), modelViewProjection));
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, modelViewProjection);
    gl.uniform1f(shProgram.irotAngle, userRotAngle);
    plane.Draw();

    // Passing variables to the shader
    gl.uniform1i(shProgram.iTMU, 0);
    gl.enable(gl.TEXTURE_2D);
    gl.uniform2fv(shProgram.iUserPoint, [userPointCoord.x, userPointCoord.y]);
    gl.uniform1f(shProgram.irotAngle, userRotAngle);
    gl.uniform2fv(shProgram.iUserPoint, [userPointCoord.x, userPointCoord.y]); //giving coordinates of user point
    gl.uniform1f(shProgram.irotAngle, userRotAngle);
    camera.ApplyLeftFrustum();

    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(modelViewProjection, camera.mLeftModelViewMatrix));

    projection = camera.mLeftProjectionMatrix;
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, m4.multiply(projection, matAccum1));
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, textureORIG);
    gl.colorMask(true, false, false, false);
    surface.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    camera.ApplyRightFrustum();
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(modelViewProjection, camera.mRightModelViewMatrix));

    projection = camera.mRightProjectionMatrix;
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, m4.multiply(projection, matAccum1));
    gl.colorMask(false, true, true, false);
    surface.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT);

    let translation = rotateVector(0, 0, angle);
    gl.uniform3fv(shProgram.iUP, [translation[0], translation[1], translation[2]]);
    if (panner) {
        panner.setPosition(translation[0], translation[1], translation[2]);
    }

    // Change the rotation angle to display a point on a surface without a texture
    gl.uniform1f(shProgram.irotAngle, 1100);
    point.DrawPoint();
    gl.colorMask(true, true, true, true);
}


function readValues() {
    let eyeSeparation = document.getElementById("eyeSeparation").value;
    camera.mEyeSeparation = eyeSeparation;

    let fieldOfView = document.getElementById("fieldOfView").value;
    camera.mFOV = fieldOfView;

    let nearClippingDistance = document.getElementById("nearClippingDistance").value;
    camera.mNearClippingDistance = parseFloat(nearClippingDistance);

    let convergence = document.getElementById("convergenceDistance").value;
    camera.mConvergence = convergence;
}

function CreateSurfaceData() {
    let vertexList = [];

    let u = 0;
    let v = 0;
    let uMax = Math.PI * 2
    let vMax = Math.PI * 2
    let uStep = uMax / 50;
    let vStep = vMax / 50;

    for (let u = 0; u <= uMax; u += uStep) {
        for (let v = 0; v <= vMax; v += vStep) {
            let vert = CalculateKleinSurface(u, v)
            let avert = CalculateKleinSurface(u + uStep, v)
            let bvert = CalculateKleinSurface(u, v + vStep)
            let cvert = CalculateKleinSurface(u + uStep, v + vStep)

            vertexList.push(vert.x, vert.y, vert.z)
            vertexList.push(avert.x, avert.y, avert.z)
            vertexList.push(bvert.x, bvert.y, bvert.z)

            vertexList.push(avert.x, avert.y, avert.z)
            vertexList.push(cvert.x, cvert.y, cvert.z)
            vertexList.push(bvert.x, bvert.y, bvert.z)
        }
    }

    return vertexList;
}

function map(val, f1, t1, f2, t2) {
    let m;
    m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
    return Math.min(Math.max(m, f2), t2);
}

function CtrateTexture() {
    let texture = [];

    let u = 0;
    let v = 0;
    let uMax = Math.PI * 2
    let vMax = Math.PI * 2
    let uStep = uMax / 50;
    let vStep = vMax / 50;

    for (let u = 0; u <= uMax; u += uStep) {
        for (let v = 0; v <= vMax; v += vStep) {
            let u1 = map(u, 0, uMax, 0, 1)
            let v1 = map(v, 0, vMax, 0, 1)
            texture.push(u1, v1)
            u1 = map(u + uStep, 0, uMax, 0, 1)
            texture.push(u1, v1)
            u1 = map(u, 0, uMax, 0, 1)
            v1 = map(v + vStep, 0, vMax, 0, 1)
            texture.push(u1, v1)
            u1 = map(u + uStep, 0, uMax, 0, 1)
            v1 = map(v, 0, vMax, 0, 1)
            texture.push(u1, v1)
            v1 = map(v + vStep, 0, vMax, 0, 1)
            texture.push(u1, v1)
            u1 = map(u, 0, uMax, 0, 1)
            v1 = map(v + vStep, 0, vMax, 0, 1)
            texture.push(u1, v1)
        }
    }

    return texture;
}

function CalculateKleinSurface(u, v) {
    const multiplier = 0.33;
    let a = 2.5
    let x = (a + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)) * Math.cos(u)
    let y = (a + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)) * Math.sin(u)
    let z = (Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v));
    return { x: x * multiplier, y: y * multiplier, z: z * multiplier }
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    video = document.createElement('video');
    video.setAttribute('autoplay', true);
    window.vid = video;
    getWebcam();
    CreateWebCamTexture();
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    // Parameters for passing variables to the shader
    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iUserPoint = gl.getUniformLocation(prog, 'userPoint');
    shProgram.irotAngle = gl.getUniformLocation(prog, 'rotA');
    shProgram.iUP = gl.getUniformLocation(prog, 'translateUP');
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

    point = new Model('Point');
    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());
    LoadTexture()
    surface.TextureBufferData(CtrateTexture());
    point.BufferData(CreateSphereSurface())
    plane = new Model('Plane');
    let planeSize = 8.0;
    plane.BufferData([0.0, 0.0, 0.0, planeSize, 0.0, 0.0, planeSize, planeSize, 0.0, planeSize, planeSize, 0.0, 0.0, planeSize, 0.0, 0.0, 0.0, 0.0]);
    plane.TextureBufferData([1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0]);

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    userPointCoord = { x: 0.1, y: 0.1 };
    userRotAngle = 0.0;
    let canvas;
    camera = new StereoCamera(50, 0.2, 1, Math.PI / 8, 8, 20);

    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    playSong();
    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
    _draw();
}

// Function of loading a picture as a texture for a surface
function LoadTexture() {
    textureORIG = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureORIG);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';

    // String with source of the texture
    image.src = "https://raw.githubusercontent.com/rudiy55/WebGL/CGW/texture.png";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, textureORIG);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );

        draw();
    }
}

function getWebcam() {
    navigator.getUserMedia({ video: true, audio: false }, function (stream) {
        video.srcObject = stream;
        track = stream.getTracks()[0];
    }, function (e) {
        console.error('Rejected', e);
    });
}

function CreateWebCamTexture() {
    textureVID = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureVID);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function StereoCamera(
    Convergence,
    EyeSeparation,
    AspectRatio,
    FOV,
    NearClippingDistance,
    FarClippingDistance
) {
    this.mConvergence = Convergence;
    this.mEyeSeparation = EyeSeparation;
    this.mAspectRatio = AspectRatio;
    this.mFOV = FOV;
    this.mNearClippingDistance = NearClippingDistance;
    this.mFarClippingDistance = FarClippingDistance;

    this.mLeftProjectionMatrix = null;
    this.mRightProjectionMatrix = null;

    this.mLeftModelViewMatrix = null;
    this.mRightModelViewMatrix = null;

    this.ApplyLeftFrustum = function () {
        let top, bottom, left, right;
        top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        bottom = -top;

        let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
        let b = a - this.mEyeSeparation / 2;
        let c = a + this.mEyeSeparation / 2;

        left = (-b * this.mNearClippingDistance) / this.mConvergence;
        right = (c * this.mNearClippingDistance) / this.mConvergence;

        // Set the Projection Matrix
        this.mLeftProjectionMatrix = m4.frustum(
            left,
            right,
            bottom,
            top,
            this.mNearClippingDistance,
            this.mFarClippingDistance
        );

        // Displace the world to right
        this.mLeftModelViewMatrix = m4.translation(
            this.mEyeSeparation / 2,
            0.0,
            0.0
        );
    };

    this.ApplyRightFrustum = function () {
        let top, bottom, left, right;
        top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        bottom = -top;

        let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
        let b = a - this.mEyeSeparation / 2;
        let c = a + this.mEyeSeparation / 2;

        left = (-c * this.mNearClippingDistance) / this.mConvergence;
        right = (b * this.mNearClippingDistance) / this.mConvergence;

        this.mRightProjectionMatrix = m4.frustum(
            left,
            right,
            bottom,
            top,
            this.mNearClippingDistance,
            this.mFarClippingDistance
        );

        this.mRightModelViewMatrix = m4.translation(
            -this.mEyeSeparation / 2,
            0.0,
            0.0
        );
    };
}

let angle = 0;

function onRead() {
    angle = Math.atan2(magSensor.y, magSensor.x)
    if (angle < 0){
        angle += Math.PI * 2;
    }
}

let magSensor = new Magnetometer();
magSensor.addEventListener("reading", onRead);
magSensor.start();

let audio = null;
let audioContext;
let source;
let panner;
let filter;

function AudioSetup() {
    audio = document.getElementById('audio');

    audio.addEventListener('play', () => {
        console.log('play');
        if (!audioContext) {
            audioContext = new AudioContext();
            source = audioContext.createMediaElementSource(audio);
            panner = audioContext.createPanner();
            filter = audioContext.createBiquadFilter();

            source.connect(panner);
            panner.connect(filter);
            filter.connect(audioContext.destination);

              filter.type = 'peaking';
              filter.Q.value = 1;
              filter.frequency.value = 500;
              filter.gain.value = 20;
            audioContext.resume();
        }
    })


    audio.addEventListener('pause', () => {
        console.log('pause');
        audioContext.resume();
    });
}

function playSong() {
    AudioSetup();

    let filterCheckbox = document.getElementById('filterCheckbox');
    filterCheckbox.addEventListener('change', function () {
        if (filterCheckbox.checked) {
            panner.disconnect();
            panner.connect(filter);
            filter.connect(audioContext.destination);
        } else {
            panner.disconnect();
            panner.connect(audioContext.destination);
        }
    });

    audio.play();
}

function rotateVector(alpha, beta, gamma) {
    const alphaRad = alpha;
    const betaRad = beta;
    const gammaRad = gamma;

    let vector = [0, 1, 0];

    const rotZ = [
        [Math.cos(gammaRad), -Math.sin(gammaRad), 0],
        [Math.sin(gammaRad), Math.cos(gammaRad), 0],
        [0, 0, 1]
    ];
    vector = multiplyMatrixVector(rotZ, vector);

    const rotY = [
        [Math.cos(betaRad), 0, Math.sin(betaRad)],
        [0, 1, 0],
        [-Math.sin(betaRad), 0, Math.cos(betaRad)]
    ];
    vector = multiplyMatrixVector(rotY, vector);

    const rotX = [
        [1, 0, 0],
        [0, Math.cos(alphaRad), -Math.sin(alphaRad)],
        [0, Math.sin(alphaRad), Math.cos(alphaRad)]
    ];
    vector = multiplyMatrixVector(rotX, vector);

    return vector;
}

function multiplyMatrixVector(matrix, vector) {
    const result = [];
    for (let i = 0; i < matrix.length; i++) {
        let sum = 0;
        for (let j = 0; j < vector.length; j++) {
            sum += matrix[i][j] * vector[j];
        }
        result.push(sum);
    }
    return result;
}