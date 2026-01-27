<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
	<div class="text-center max-w-lg px-6">
		<div class="mb-6 text-6xl">Coming Soon</div>
		<h1 class="text-3xl font-bold text-white mb-4">Amplicon Bacteria Mode</h1>
		<p class="text-slate-400 mb-8">
			16S rRNA gene sequencing analysis for microbiome studies is currently under development.
			Check back soon for QIIME2, DADA2, and diversity analysis tutorials.
		</p>
		<div class="space-y-4">
			<div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
				<h3 class="text-white font-medium mb-2">Planned Tools</h3>
				<div class="flex flex-wrap gap-2 justify-center">
					<span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">QIIME2</span>
					<span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">DADA2</span>
					<span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">Phyloseq</span>
					<span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">PICRUSt2</span>
					<span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">LEfSe</span>
				</div>
			</div>
		</div>
		<button
			onclick={() => goto('/')}
			class="mt-8 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
		>
			Back to Home
		</button>
	</div>
</div>
