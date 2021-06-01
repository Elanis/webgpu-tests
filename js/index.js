const SWAP_CHAIN_FORMAT = 'bgra8unorm';

const FRAGMENT_SHADER = `
    [[stage(fragment)]]
    fn main([[location(0)]] inColor : vec3<f32>) -> [[location(0)]] vec4<f32> {
        return vec4<f32>(inColor, 1.0);
    }
`;

const VERTEX_SHADER = `
    let positions : array<vec2<f32>, 3> = array<vec2<f32>, 3>(
	    vec2<f32>(0.0, 0.5),
	    vec2<f32>(-0.5, -0.5),
	    vec2<f32>(0.5, -0.5)
    );

    let colors : array<vec3<f32>, 3> = array<vec3<f32>, 3>(
	    vec3<f32>(1.0, 0.0, 0.0),
	    vec3<f32>(0.0, 1.0, 0.0),
	    vec3<f32>(0.0, 0.0, 1.0)
    );

	struct VertexOutput {
	    [[builtin(position)]] Position : vec4<f32>;
	    [[location(0)]] fragColor : vec3<f32>;
	};
  
    [[stage(vertex)]]
    fn main([[builtin(vertex_idx)]] VertexIndex : i32) -> VertexOutput {
    	var vertexOutput : VertexOutput;

        vertexOutput.Position = vec4<f32>(positions[VertexIndex], 0.0, 1.0);
        vertexOutput.fragColor = colors[VertexIndex];

        return vertexOutput;
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
	console.log(await vertexShaderModule.compilationInfo());

	const fragmentShaderModule = device.createShaderModule({
		code: FRAGMENT_SHADER
	});
	console.log(await fragmentShaderModule.compilationInfo());

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
			view: textureView,
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

