const https = require('https');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs-extra');
const moment = require('moment');

const defaults = {
  alias: {
    u: 'user',
	h: 'help'
  }
};

const help = `
Usage: octonums [OPTIONS]
Example:
  $ octonums --user vladikoff 
Options:
  -u --user              Display stats from user name
`;

const countFiles = (str) => {
  const re = /(?=\d+.(file|files))\d+/g
  return ((str || '').match(re) || [0]).reduce((acc, curr)=>acc + parseInt(curr), 0);
}

const countInserted = (str) => {
  const re = /(?=\d+.(insertion|insertions))\d+/g
  return ((str || '').match(re) || [0]).reduce((acc, curr)=>acc + parseInt(curr), 0);
}

const countDeleted = (str) => {
  const re = /(?=\d+.(deletion|deletions))\d+/g
  return ((str || '').match(re) || [0]).reduce((acc, curr)=>acc + parseInt(curr), 0);
}

let argv = require('minimist')(process.argv.slice(2), defaults);

if (argv.help) {
    process.stderr.write(help);
    return;
}

function GetStdev(array){
	let sum =  f.reduce((total, num) => total + num );
	let mean = sum / array.length;
	let squares = array.map( num, Math.pow(num - mean, 2));
	let variance =  squares.reduce((total, num) => total + num );
	
	return Math.sqrt(variance);
}

async function calculateChunk(gitUrl, filter, key) {
	let gitFolder = gitUrl.split('/');
	gitFolder = gitFolder[gitFolder.length-1];
	
	// [...Array(13).keys()]
	return new Promise((resolve, reject) => {
		exec(
			'git log --shortstat --author="Juan" '+filter+' | grep -E "fil(e|es) changed" || print "NONE"', 
			{cwd: 'repos/' + gitFolder},
			function(err, stdout, stderr){
				if(err){
					console.log(err)
				}
				
				var out = { 
					"id" : key,
					"repo" : gitFolder,
					"files" : countFiles(stdout),
					"linesAdded" : countInserted(stdout),
					"linesDeleted" : countDeleted(stdout),
					"lines" : countInserted(stdout) - countDeleted(stdout)
				}

				//Add./Del. ratio (1:${countDeleted(stdout) / countInserted(stdout)})!

				//console.log('--- ' + gitFolder + ' processed ---');
				//console.log(out);
				resolve(out);
			}
		);
	});
}

async function run(){
	if (!fs.existsSync('repos')){
		fs.mkdirSync('repos');
	}

	var data = fs.readFileSync('repos.json');
	let repos = JSON.parse(data);
	let gits = repos.map(r => r.git_url);

	// 1. Download repos
	for await (const git of gits) {
		console.log('Download ' + git);
		let gitFolder = git.split('/');
		gitFolder = gitFolder[gitFolder.length-1];

		fs.removeSync('repos/' + gitFolder);
		const { stdout, stderr } = await exec('git clone --bare ' + git + ' repos/' + gitFolder);
	}
	
	// 2. Get stats
	let stats = [];
	let monthStats = [];
	let yearStats = [];
	let calculation;
	
	// Config
	let months = 13;
	let years = 5;
	
	// Last year by months
	while (months-->1) {
		stats = [];
		
		for await (const git of gits) {
			let before = (months-1 == 0) ? 'today"' : (months-1) + ' months ago"';
			let filter = '--since="'+months+' months ago" --before="' + before;
			let key = moment().subtract(months, 'months').format('MMM');
			calculation = await calculateChunk(git, filter, key);

			stats.push(calculation);
		}
		monthStats.push(stats);
	}
	
	// Last year by quarters ...

	// by years
	while (years-->1) {
		stats = [];
		
		for await (const git of gits) {
			let before = (years-1 == 0) ? 'today"' : (years-1) + ' years ago"';
			let filter = '--since="'+years+' years ago" --before="' + before;
			let key = moment().subtract(years, 'years').format('YYYY') + (years-1==0?'*':'');
			calculation = await calculateChunk(git, filter, key);

			stats.push(calculation);
		}
		
		yearStats.push(stats);
	}
	
	// 3. Print tables
	let mTable = [];
	mTable.push();
	for (const mStats of monthStats) {
		
	}
	
	for (const yStats of yearStats) {
		
	}
	
	//console.log(stats);	
	fs.writeJsonSync('./salida.json', stats);
}

run();

/*
Total LoC
Files
Repositories 

Last 5 Years

      2015  2016   2017   2018   2019* 
 --- ----- ------ ------ ------ ------
  #    321  454    5546   6545    64  
  b    ↑↑    ↓      ↑      ↑↑     ↑↑  
  
Last Year
   #   Q1    Q2     Q3     Q4  
 --- ----- ------ ------ ------
  a    ↑↑    ↓      ↑      ↑↑  

... by month

  #   Jan   Feb    Mar    Apr    Jan   Feb    Mar    Apr    Jan   Feb    Mar    Apr    Jan   Feb    Mar    Apr  
 --- ----- ------ ------ ------ ----- ------ ------ ------ ----- ------ ------ ------ ----- ------ ------ ------
  a    ↑↑    ·      ↑      ↓      ↑↑    ·      ↑      ↑↑     ↑↑    ·      ↑      ↑↑     ↑↑    ·      ↑      ↑↑       

*/
