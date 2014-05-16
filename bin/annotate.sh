#!/bin/bash

#PBS -N GuestGenome
#PBS -q large
#PBS -l walltime=360:00:00
#PBS -l nodes=1:ppn=3
###############################
### Display the job context ###
###############################
WORKDIR=/chongle/jj/01_PfClust/CodeBase/example/GuestGenome
echo Working directory is $WORKDIR
cd $WORKDIR

echo Running on host `hostname`
echo Starting Time is `date`
echo Directory is `pwd`

python /chongle/jj/01_PfClust/CodeBase/src/UniFam.py -i GuestGenome.fna -c  config.cfg -o GuestGenome.annot > GuestGenome.log

echo Ending Time is `date`
