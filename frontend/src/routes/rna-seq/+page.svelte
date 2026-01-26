<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
	<div class="text-center max-w-lg px-6">
		<div class="mb-6 text-6xl">Coming Soon</div>
		<h1 class="text-3xl font-bold text-white mb-4">RNA-Seq Mode</h1>
		<p class="text-slate-400 mb-8">
			Transcriptomics analysis for differential gene expression is currently under development.
			Learn to analyze gene expression changes between conditions.
		</p>
		<div class="space-y-4">
			<div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
				<h3 class="text-white font-medium mb-2">Planned Tools</h3>
				<div class="flex flex-wrap gap-2 justify-center">
					<span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">STAR</span>
					<span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">HISAT2</span>
					<span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">featureCounts</span>
					<span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">DESeq2</span>
					<span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">edgeR</span>
					<span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">ClusterProfiler</span>
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
