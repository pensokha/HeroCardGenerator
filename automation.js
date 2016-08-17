"use strict"

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const phantomjs = require('phantomjs-prebuilt');
const binPath = phantomjs.path;
const phantomjs_script = "phantomJS-scirpt.js";
const chineseConv = require('chinese-conv');
const tmp_dir = './tmp/';
const output_dir = './outputs/';
const source_dir = "./data/";

if (!fs.existsSync(tmp_dir)) {
    fs.mkdirSync(tmp_dir);
}

if (!fs.existsSync(output_dir)) {
    fs.mkdirSync(output_dir);
}

let card_template = fs.readFileSync('./template.html').toString();

let skill_section_template = " \
	<div class=\"skill-block\"> \
		<div class=\"skill-title-content\"> \
			<b>[-title-]</b> \
		</div> \
		<div class=\"skill-description-content\"> \
			<skill-description>[-description-]</skill-description> \
		</div> \
	</div>"

let blood_template = "<div class=\"blood\"></div>";

let files = fs.readdirSync(source_dir);
for (let i in files) {
    let file = files[i];
    if (file.endsWith(".json")) {
        create_card(source_dir + file);
    }
}

function create_card(source) {

    let contents = fs.readFileSync(source);
    let jsonContent = JSON.parse(contents);

    let id = jsonContent.id;
    let clan = jsonContent.clan;
    let image = "./data/" + id + ".jpg";
    let blood_number = jsonContent.blood_number;
    let nickname = chineseConv.tify(jsonContent.nickname);
    let name = chineseConv.tify(jsonContent.name);
    let skills_group = jsonContent.skills_group;

    console.log("Found profile for " + id);

    let bloods = "";
    for (let i = 0; i < blood_number; i++) {
        bloods += blood_template;
    }

    let skills = "";
    for (let i = 0; i < skills_group.length; i++) {
        let skill = skill_section_template
            .replace("[-title-]", skills_group[i].title)
            .replace("[-description-]", skills_group[i].description);
        skills += skill;
    }

    let card = card_template.replace("[image]", image)
        .replace("[clan]", clan)
        .replace("[bloods]", bloods)
        .replace("[nickname]", nickname)
        .replace("[name]", name)
        .replace("[skills]", skills);

    let tmp_html_path = tmp_dir + id + '_output.html';
    let output_image_path = output_dir + id + '.png';

    fs.writeFileSync(tmp_html_path, card);

    let childArgs = [
        path.join(__dirname, phantomjs_script),
        tmp_html_path,
        output_image_path
    ];

    childProcess.execFile(binPath, childArgs, function(err, stdout, stderr) {

        if (err) {
            console.log(err);
        }

        if (stderr) {
            console.log(stderr);
        }

        console.log(id + " card is generated: " + output_image_path);
    });
}
