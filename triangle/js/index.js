const PRESENTATION_FORMAT = navigator.gpu.getPreferredCanvasFormat();

const FRAGMENT_SHADER = `
	@fragment
	fn main(@location(0) inColor : vec3<f32>) -> @location(0) vec4<f32> {
		return vec4<f32>(inColor, 1.0);
	}
`;

const VERTEX_SHADER = `
	const positions = array<vec2<f32>, 3>(
		vec2<f32>(0.0, 0.5),
		vec2<f32>(-0.5, -0.5),
		vec2<f32>(0.5, -0.5)
	);

	const colors = array<vec3<f32>, 3>(
		vec3<f32>(1.0, 0.0, 0.0),
		vec3<f32>(0.0, 1.0, 0.0),
		vec3<f32>(0.0, 0.0, 1.0)
	);

	struct VertexOutput {
		@builtin(position) Position : vec4<f32>,
		@location(0) fragColor : vec3<f32>
	};
  
	@vertex
	fn main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
		var vertexOutput : VertexOutput;

		vertexOutput.Position = vec4<f32>(positions[VertexIndex], 0.0, 1.0);
		vertexOutput.fragColor = colors[VertexIndex];

		return vertexOutput;
	}
`;

const devicePixelRatio = window.devicePixelRatio || 1;
const presentationSize = [
	canvas.clientWidth * devicePixelRatio,
	canvas.clientHeight * devicePixelRatio,
];
const sampleCount = 4;

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

	const pipeline = device.createRenderPipeline({
		layout: 'auto',
		vertex: {
			module: vertexShaderModule,
			entryPoint: 'main'
		},
		fragment: {
			module: fragmentShaderModule,
			entryPoint: 'main',
			targets: [
				{ format: PRESENTATION_FORMAT }
			]
		},
		primitive: {
			topology: 'triangle-list'
		},
		multisample: {
			count: 4,
		},
	});

	/**
	 * Render
	 */
	const commandEncoder = device.createCommandEncoder();
	const texture = device.createTexture({
		size: presentationSize,
		sampleCount,
		format: PRESENTATION_FORMAT,
		usage: GPUTextureUsage.RENDER_ATTACHMENT,
	});
	const textureView = texture.createView();

	const renderPassDescriptor = {
		colorAttachments: [{
			view: textureView,
			resolveTarget: context.getCurrentTexture().createView(),
			clearValue: {
				r: 0,
				g: 0,
				b: 0,
				a: 1
			},
			loadOp: 'clear',
			storeOp: 'discard',
		}]
	};

	const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
	pass.setPipeline(pipeline);
	pass.draw(3, 1, 0, 0);
	pass.end();

	device.queue.submit([commandEncoder.finish()]);
})();

