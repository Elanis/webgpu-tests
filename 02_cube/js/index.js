import * as mat4 from './gl-matrix/mat4.js';
import * as vec3 from './gl-matrix/vec3.js';

import cubeVertexArray from './cube.js';

const CUBE_POS_OFFSET = 0;
const CUBE_UV_OFFSET = 4 * 8;
const CUBE_VTX_COUNT = 36;
const CUBE_VTX_SIZE = 4 * 10;

const PRESENTATION_FORMAT = navigator.gpu.getPreferredCanvasFormat();

const FRAGMENT_SHADER = `
	@fragment
	fn main(@location(0) fragUV : vec2<f32>, @location(1) fragPosition : vec4<f32>) -> @location(0) vec4<f32> {
		return fragPosition;
	}
`;

const VERTEX_SHADER = `
	struct Uniforms {
		modelViewProjectionMatrix : mat4x4<f32>,
	}
	@binding(0) @group(0) var<uniform> uniforms : Uniforms;

	struct VertexOutput {
		@builtin(position) Position : vec4<f32>,
		@location(0) fragUV : vec2<f32>,
		@location(1) fragPosition: vec4<f32>
	};
  
	@vertex
	fn main(@location(0) position : vec4<f32>, @location(1) uv : vec2<f32>) -> VertexOutput {
		var output : VertexOutput;
		output.Position = uniforms.modelViewProjectionMatrix * position;
		output.fragUV = uv;
		output.fragPosition = 0.5 * (position + vec4(1.0, 1.0, 1.0, 1.0));

		return output;
	}
`;

const devicePixelRatio = window.devicePixelRatio || 1;
const presentationSize = [
	canvas.clientWidth * devicePixelRatio,
	canvas.clientHeight * devicePixelRatio,
];

(async() => {
	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) return;
	const device = await adapter.requestDevice();

	const canvas = document.getElementById('canvas');
	const context = canvas.getContext('webgpu');

	context.configure({
		device,
		format: PRESENTATION_FORMAT,
		alphaMode: 'opaque',
	});

	/**
	 * Pipeline
	 */
	const vertexShaderModule = device.createShaderModule({
		code: VERTEX_SHADER
	});
	console.log(await vertexShaderModule.compilationInfo());

	const fragmentShaderModule = device.createShaderModule({
		code: FRAGMENT_SHADER
	});
	console.log(await fragmentShaderModule.compilationInfo());

	// Cube vertex buffer
	const vertexBuffer = device.createBuffer({
		size: cubeVertexArray.byteLength,
		usage: GPUBufferUsage.VERTEX,
		mappedAtCreation: true,
	});
	new Float32Array(vertexBuffer.getMappedRange()).set(cubeVertexArray);
	vertexBuffer.unmap();

	const pipeline = device.createRenderPipeline({
		layout: 'auto',
		vertex: {
			module: vertexShaderModule,
			entryPoint: 'main',
			buffers: [
				{
					arrayStride: CUBE_VTX_SIZE,
					attributes: [{
						shaderLocation: 0, // Position
						offset: CUBE_POS_OFFSET,
						format: 'float32x4',
					}, {
						shaderLocation: 1, // UV
						offset: CUBE_UV_OFFSET,
						format: 'float32x2',
					}],
				},
			],
		},
		fragment: {
			module: fragmentShaderModule,
			entryPoint: 'main',
			targets: [
				{ format: PRESENTATION_FORMAT }
			]
		},
		primitive: {
			topology: 'triangle-list',
			cullMode: 'back', // Backface culling
		},
		depthStencil: {
			depthWriteEnabled: true,
			depthCompare: 'less',
			format: 'depth24plus',
		},
	});

	/**
	 * Render
	 */
	const texture = device.createTexture({
		size: presentationSize,
		format: 'depth24plus',
		usage: GPUTextureUsage.RENDER_ATTACHMENT,
	});
	const textureView = texture.createView();

	const uniformBufferSize = 4 * 16; // 4x4 matrix
	const uniformBuffer = device.createBuffer({
		size: uniformBufferSize,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
	});

	const uniformBindGroup = device.createBindGroup({
		layout: pipeline.getBindGroupLayout(0),
		entries: [{
			binding: 0,
			resource: {
				buffer: uniformBuffer,
			},
		}],
	});

	const renderPassDescriptor = {
		colorAttachments: [{
			clearValue: {
				r: 0.5,
				g: 0.5,
				b: 0.5,
				a: 1
			},
			loadOp: 'clear',
			storeOp: 'store',
		}],
		depthStencilAttachment: {
			view: textureView,
			depthClearValue: 1.0,
			depthLoadOp: 'clear',
			depthStoreOp: 'store',
		}
	};

	const aspect = canvas.width / canvas.height;
	const projectionMatrix = mat4.create();
	mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 100.0);

	function getTransformationMatrix() {
		const viewMatrix = mat4.create();
		mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -4));
		const now = Date.now() / 1000;
		mat4.rotate(
		viewMatrix,
		viewMatrix,
		1,
		vec3.fromValues(Math.sin(now), Math.cos(now), 0)
		);

		const modelViewProjectionMatrix = mat4.create();
		mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);

		return modelViewProjectionMatrix;
	}

	function drawFrame() {
		const transformationMatrix = getTransformationMatrix();

		device.queue.writeBuffer(
			uniformBuffer,
			0,
			transformationMatrix.buffer,
			transformationMatrix.byteOffset,
			transformationMatrix.byteLength
		);


		renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
		const commandEncoder = device.createCommandEncoder();
		const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
		pass.setPipeline(pipeline);
		pass.setBindGroup(0, uniformBindGroup);
		pass.setVertexBuffer(0, vertexBuffer);
		pass.draw(CUBE_VTX_COUNT, 1, 0, 0);
		pass.end();

		device.queue.submit([commandEncoder.finish()]);

		window.requestAnimationFrame(drawFrame);
	}

	window.requestAnimationFrame(drawFrame);
})();

