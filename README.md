# UNIFAM

UNIFAM Website, hosted at http://unifam.ornl.gov

A pipeline to annotate proteins with newly developed protein family database (UniFam) and to predict metabolic pathways for a genome is made available to users. UniFam is a new protein family database based on proteins in UniProt including SwissProt and Trembl. It annotates proteins on the full sequence level instead of on the domain level.

User can either give a list of proteins as input for annotation to be used in downstream analysis, or provide a fully sequenced genome. In the latter case, Prodigal will be used to predict protein-coding genes in the genome and the coded proteins. UniFam is then used to annotate all these proteins. If desired, the pipeline can also predict metabolic pathways using PathoLogic module of Pathway-tools, with the all annotated proteins in a genome.

The output of the pipeline is a table of proteins with their function annotations, and a list of inferred pathways if specified.

## Installation
```bash
#Clone the repo from github.
cd unifam
npm install
```

## Development

* To monitor and develop
	cd <development dir>
	./mon

## Production

* To start forever
	cd unifam
	./daemon.sh

* To stop already started forever process
	cd unifam
	./daemon-stop.sh

