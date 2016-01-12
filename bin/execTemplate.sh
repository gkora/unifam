#!/bin/bash

#PBS -N <%= name %>
#PBS -q <%= pbsQ %>
#PBS -l walltime=360:00:00
#PBS -l nodes=1:ppn=<%= cpu %>
###############################
### Display the job context ###
###############################

WORKDIR=<%= workdir %>
echo Working directory is $WORKDIR
cd $WORKDIR

echo Running on host `hostname`
echo Starting Time is `date`
echo Directory is `pwd`

python <%= sourceLocation %> -i "<%= inputFileName %>" -c  config.cfg  > <%= inputFileName %>.log 

echo Ending Time is `date`

## Tell the server its done.
curl --data "id=<%= id %>" <%= server %> > /dev/null
