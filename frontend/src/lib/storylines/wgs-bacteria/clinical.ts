import type { Storyline } from '../types';
import {
	createNanoporePhase1Sections,
	createNanoporePhase2Sections,
	createNanoporePhase3Sections
} from './sections';

export const clinical: Storyline = {
	id: 'clinical',
	category: 'wgs_bacteria',
	title: 'Clinical Rapid Diagnostics',
	subtitle: 'Same-Day Pathogen Identification',
	organism: 'Pseudomonas aeruginosa',
	technology: 'nanopore',
	technologyLabel: 'Long Read (ONT)',
	dataDir: '/data/clinical_samples',
	toolsUsed: [
		'seqkit',
		'NanoPlot',
		'porechop',
		'filtlong',
		'kraken2',
		'flye',
		'medaka_consensus',
		'Bandage',
		'quast',
		'abricate',
		'mlst',
		'prokka',
		'bakta',
		'mob_recon',
		'modkit'
	],
	sections: [
		{
			type: 'intro',
			text: `URGENT - Clinical Microbiology Laboratory:\n\nA critically ill patient in the burn unit has developed a rapidly progressing wound infection. Blood cultures are growing Gram-negative rods. The clinical team needs rapid identification and antimicrobial susceptibility guidance—standard culture-based methods will take 48-72 hours.`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'image',
			title: 'Oxford Nanopore MinION Sequencer',
			text: 'The portable MinION device enables rapid, real-time sequencing at the point of care. Results can be obtained within hours rather than days, enabling faster clinical decision-making.',
			imageUrl: '/images/minion_sequencer.svg',
			imageAlt: 'Oxford Nanopore MinION portable sequencing device connected to a laptop'
		},
		{
			type: 'context',
			text: `DNA has been extracted directly from positive blood culture and loaded onto a MinION sequencer. Oxford Nanopore technology provides:\n\n• **Real-time sequencing:** Results stream as sequencing progresses\n• **Rapid turnaround:** Species ID within 1 hour, AMR within 4 hours\n• **Long reads:** Complete gene context without assembly fragmentation\n• **Portability:** Can be performed at bedside or in resource-limited settings\n\nYour task: Rapidly identify the pathogen, detect resistance genes, and provide actionable guidance to the clinical team.`,
			hint: null,
			requiredDir: null
		},
		...createNanoporePhase1Sections('/data/clinical_samples'),
		{
			type: 'alert',
			title: 'Rapid Species Identification',
			text: `**Kraken2 Classification Result (15 minutes):**\n\n• **Species:** Pseudomonas aeruginosa (98.7% reads classified)\n• **Confidence:** High (>95% agreement across k-mers)\n\n**Clinical Significance:**\nP. aeruginosa is an opportunistic pathogen notorious for:\n• Intrinsic resistance to many antibiotics\n• Ability to acquire additional resistance mechanisms\n• Biofilm formation in burn wounds\n• High mortality in bacteremic patients\n\nContinue analysis for resistance gene detection...`
		},
		...createNanoporePhase2Sections('/data/clinical_samples'),
		{
			type: 'alert',
			title: 'Critical AMR Alert',
			text: `**Resistance Gene Detection (2 hours):**\n\n**Detected resistance mechanisms:**\n• blaVIM-2: Metallo-β-lactamase (carbapenem resistance)\n• aac(6')-Ib: Aminoglycoside resistance\n• Chromosomal oprD mutation: Imipenem resistance\n\n**Predicted Resistance Profile:**\n• Carbapenems: RESISTANT (meropenem, imipenem)\n• Aminoglycosides: RESISTANT (gentamicin, tobramycin)\n• Fluoroquinolones: Likely SUSCEPTIBLE\n• Colistin: Likely SUSCEPTIBLE\n\n**Immediate Clinical Recommendation:**\n⚠️ Avoid carbapenems and aminoglycosides\n✓ Consider colistin + fluoroquinolone combination pending confirmatory susceptibility testing`
		},
		...createNanoporePhase3Sections('/data/clinical_samples'),
		{
			type: 'task',
			title: 'Step 17: Resistance Gene Context',
			text: `Analyze the genetic environment of resistance genes.`,
			command: 'abricate --db card polished/consensus.fasta -o card_results/',
			explanation: 'CARD database provides detailed resistance mechanism annotations.',
			requiredDir: '/data/clinical_samples',
			parameters: [
				{ name: '--db card', desc: 'Use CARD database' },
				{ name: '-o card_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 18: Integron Analysis',
			text: `Check for integron-associated resistance.`,
			command: 'integron_finder polished/consensus.fasta --outdir integron_results/',
			explanation: 'IntegronFinder detects gene cassettes that may carry additional resistance genes.',
			requiredDir: '/data/clinical_samples',
			parameters: [{ name: '--outdir integron_results/', desc: 'Output directory' }]
		},
		{
			type: 'phase',
			title: 'Phase 4: Clinical Correlation',
			text: 'Compare with outbreak database and finalize recommendations.',
			phase: 4
		},
		{
			type: 'task',
			title: 'Step 19: MLST Comparison',
			text: `Compare sequence type with known outbreak strains.`,
			command: 'mlst polished/consensus.fasta > o_mlst/mlst_result.tab',
			explanation: 'MLST helps identify if this strain matches known outbreak clusters.',
			requiredDir: '/data/clinical_samples',
			parameters: [{ name: '>', desc: 'Redirect output to file' }]
		},
		{
			type: 'context',
			text: `**MLST Result:** ST235\n\n**Epidemiological Significance:**\nST235 is a globally disseminated high-risk clone of P. aeruginosa known for:\n• Association with hospital outbreaks worldwide\n• Frequent carriage of metallo-β-lactamases (VIM, IMP)\n• Enhanced virulence and transmissibility\n• Poor clinical outcomes\n\nThis finding triggers additional infection control measures.`
		},
		{
			type: 'task',
			title: 'Step 20: Generate Clinical Report',
			text: `Create a summary report for the clinical team.`,
			command:
				'summary_report --input polished/consensus.fasta --amr o_abricate/ --mlst o_mlst/ -o clinical_report/',
			explanation: 'Generates a clinical summary for immediate use by the care team.',
			requiredDir: '/data/clinical_samples',
			parameters: [
				{ name: '--input', desc: 'Assembly file' },
				{ name: '--amr', desc: 'AMR results directory' },
				{ name: '-o clinical_report/', desc: 'Output directory' }
			]
		},
		{
			type: 'complete',
			title: 'Analysis Complete',
			text: `Congratulations! You have completed the Clinical Rapid Diagnostics Investigation.\n\n**Timeline Achieved:**\n• Species ID: 15 minutes (Kraken2)\n• Resistance detection: 2 hours (ABRicate)\n• Complete genome: 4 hours (Flye + Medaka)\n• Full report: 6 hours total\n\n**vs. Traditional Methods: 48-72 hours**\n\n**Key Findings:**\n• Pseudomonas aeruginosa ST235 (high-risk clone)\n• Carbapenem-resistant (blaVIM-2 positive)\n• Aminoglycoside-resistant (aac(6')-Ib)\n• Located on class 1 integron with additional gene cassettes\n\n**Clinical Impact:**\n• Antibiotic therapy adjusted within 6 hours (vs. 72 hours)\n• Appropriate empiric coverage initiated immediately\n• Infection control team alerted to high-risk clone\n• Contact precautions implemented for burn unit\n\n**Patient Outcome:**\nEarly appropriate therapy enabled by rapid sequencing contributed to improved clinical response. The patient showed improvement within 48 hours of targeted therapy initiation.\n\n**Why Nanopore was ideal:**\n• Real-time data streaming for rapid species ID\n• Portable format suitable for clinical lab\n• Long reads resolved the integron structure completely\n• No batching required—single sample, immediate results`
		}
	]
};
