const https = require('https');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const chunkSize = 5;
const fs = require('fs-extra');

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

async function lsExample(gitUrl) {
	let gitFolder = gitUrl.split('/')
	gitFolder = gitFolder[gitFolder.length-1];
	
	fs.removeSync(gitFolder);
	
	const { stdout, stderr } = await exec('git clone --bare ' + gitUrl);
	var result = await exec('git log --shortstat --author="Juan" | grep -E "fil(e|es) changed"', {cwd: './' + gitFolder},
		 function(err, stdout, stderr){
			var out = `Files changed  ${countFiles(stdout)}!
Lines added   ${countInserted(stdout)}!
Lines deleted ${countDeleted(stdout)}!
Total lines ${countInserted(stdout) - countDeleted(stdout)}!
Add./Del. ratio (1:${countDeleted(stdout) / countInserted(stdout)})!`;
			console.log('--- ' + gitFolder + ' processed ---');
			console.log(out);
		 }
	);
}

async function calculateQuarter(gitUrl, filter) {
	let gitFolder = gitUrl.split('/')
	gitFolder = gitFolder[gitFolder.length-1];
	
	fs.removeSync(gitFolder);
	
	const { stdout, stderr } = await exec('git clone --bare ' + gitUrl);
	var result = await exec('git log --shortstat --author="Juan" ' + filter + ' | grep -E "fil(e|es) changed"', {cwd: './' + gitFolder},
		 function(err, stdout, stderr){
			var out = `Files changed  ${countFiles(stdout)}!
Lines added   ${countInserted(stdout)}!
Lines deleted ${countDeleted(stdout)}!
Total lines ${countInserted(stdout) - countDeleted(stdout)}!
Add./Del. ratio (1:${countDeleted(stdout) / countInserted(stdout)})!`;
			console.log('--- '+gitFolder + ' processed ---')
			console.log(out);
		 }
	);
}

var data = fs.readFileSync('repos.json');
let repos = JSON.parse(data);
let gits = repos.map(r => r.git_url);

gits.forEach(function(git, i){
	//lsExample(git);
	calculateQuarter(git, '--since="3 months ago" --before=today');
});

/*
https.get('https://api.github.com/users/jdjuan/repos', (resp) => {
  let data = '';

  // A chunk of data has been recieved.
  resp.on('data', (chunk) => {
    data += chunk;
  });

  // The whole response has been received. Print out the result.
  resp.on('end', () => {
	let repos = JSON.parse(data);
    let gits = repos.map(r => r.git_url);
	
	gits.forEach(function(git, i){
		lsExample(git);
	});
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});

*/
