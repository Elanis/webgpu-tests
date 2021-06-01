const SWAP_CHAIN_FORMAT = 'bgra8unorm';

const FRAGMENT_SHADER = `
    [[location(0)]] var<in> inColor : vec3<f32>;
    [[location(0)]] var<out> outColor : vec4<f32>;
  
    [[stage(fragment)]]
    fn main() -> void {
        outColor = vec4<f32>(inColor, 1.0);
        return;
    }
`;

const VERTEX_SHADER = `
    const positions : array<vec2<f32>, 3> = array<vec2<f32>, 3>(
	    vec2<f32>(0.0, 0.5),
	    vec2<f32>(-0.5, -0.5),
	    vec2<f32>(0.5, -0.5)
    );

    const colors : array<vec3<f32>, 3> = array<vec3<f32>, 3>(
	    vec3<f32>(1.0, 0.0, 0.0),
	    vec3<f32>(0.0, 1.0, 0.0),
	    vec3<f32>(0.0, 0.0, 1.0)
    );
  
    [[builtin(position)]] var<out> Position : vec4<f32>;
    [[location(0)]] var<out> fragColor : vec3<f32>;
    [[builtin(vertex_idx)]] var<in> VertexIndex : i32;
  
    [[stage(vertex)]]
    fn main() -> void {
        Position = vec4<f32>(positions[VertexIndex], 0.0, 1.0);
        fragColor = colors[VertexIndex];
        return;
    }
`;


(async() => {
	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) return;
	const device = await adapter.requestDevice();

	const canvas = document.getElementById('canvas');
	const context = canvas.getContext('gpupresent');

	/**
	 * Swapchain
	 */
	const swapChain = context.configureSwapChain({
		device,
		format: SWAP_CHAIN_FORMAT
	});

	/**
	 * Pipeline
	 */
	const vertexShaderModule = device.createShaderModule({
		code: VERTEX_SHADER
	});

	const fragmentShaderModule = device.createShaderModule({
		code: FRAGMENT_SHADER
	});

	const pipeline = device.createRenderPipeline({
		vertex: {
			module: vertexShaderModule,
			entryPoint: 'main'
		},
		fragment: {
			module: fragmentShaderModule,
			entryPoint: 'main',
			targets: [
				{ format: SWAP_CHAIN_FORMAT }
			]
		},
		primitive: {
			topology: 'triangle-list'
		}
	});

	/**
	 * Render
	 */
	const commandEncoder = device.createCommandEncoder();
	const textureView = swapChain.getCurrentTexture().createView();

	const renderPassDescriptor = {
		colorAttachments: [{
			attachment: textureView,
			loadValue: {
				r: 0,
				g: 0,
				b: 0,
				a: 1
			},
		}]
	};

	const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
	pass.setPipeline(pipeline);
	pass.draw(3, 1, 0, 0);
	pass.endPass();

	device.queue.submit([commandEncoder.finish()]);
})();

