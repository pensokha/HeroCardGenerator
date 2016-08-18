"use strict"

const fs = require('fs.extra');
const path = require('path');
const childProcess = require('child_process');
const phantomjs = require('phantomjs-prebuilt');
const binPath = phantomjs.path;
const phantomjs_script = "phantomJS-scirpt.js";
const chineseConv = require('chinese-conv');

const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');

const templates_dir = "./templates/"

let preset_skills;
try {
    preset_skills = JSON.parse(fs.readFileSync("./skills.json")).skills;
} catch (e) {
    console.log("Failed to read preset skills: " + e);
}
let preset_skills_len = preset_skills.length;

// Configuration begins
const tmp_dir = './tmp/';
const output_dir = './outputs/';
const source_dir = "./data/";

let template = 'Mondrian';
let format = '.png';
let optimized = true;
// Configuration ends

if (!fs.existsSync(tmp_dir)) {
    fs.mkdirSync(tmp_dir);
}

if (!fs.existsSync(output_dir)) {
    fs.mkdirSync(output_dir);
}

let template_dir = templates_dir + template + '/';
let template_path = template_dir + 'template.html';
let template_content = fs.readFileSync(template_path).toString();

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

    let jsonContent;
    try {
        jsonContent = JSON.parse(contents);
    } catch (e) {
        console.log("The content of " + source + "is not a valid json.");
        return;
    }

    let id = jsonContent.id;
    let clan = jsonContent.clan;
    let image = get_profile_image(id);
    let blood_number = jsonContent.blood_number;
    let nickname = chineseConv.tify(jsonContent.nickname);
    let name = chineseConv.tify(jsonContent.name);
    let skills_group = [];

    if (jsonContent.hasOwnProperty('skills_group')){
        skills_group = jsonContent.skills_group;
    } else {
        let randome_skill = get_random_skill(-1);
        skills_group.push(randome_skill.skill);
        skills_group.push(get_random_skill(randome_skill.index).skill);
        jsonContent['skills_group'] = skills_group;
        fs.writeFile(source, JSON.stringify(jsonContent, null, 4), (err) => {
          if (err) throw err;
          console.log('Random skills are saved to ' + id + '\'profile');
        });
    }

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

    let card = template_content
        .replace("[tempalte_relative_path]", "../" + template_dir)
        .replace("[image]", image)
        .replace("[clan]", clan)
        .replace("[bloods]", bloods)
        .replace("[nickname]", nickname)
        .replace("[name]", name)
        .replace("[skills]", skills);

    let tmp_html_path = tmp_dir + id + '_output.html';
    let tmp_image_path = tmp_dir + id + format;
    let output_image_path = output_dir + id + format;

    fs.writeFileSync(tmp_html_path, card);

    let childArgs = [
        path.join(__dirname, phantomjs_script),
        tmp_html_path,
        tmp_image_path
    ];

    childProcess.execFile(binPath, childArgs, (err, stdout, stderr) => {

        if (err) {
            console.log(stderr);
            return;
        }

        if (optimized) {
            console.log("Optimizing image for " + id);
            imagemin([tmp_image_path], output_dir, {
                plugins: [
                    imageminMozjpeg({targa: true}),
                    imageminPngquant({quality: '65-80'})
                ]
            }).then(files => {
                console.log(id + " card is created at " + output_image_path);
            });
        } else {
            fs.copy(tmp_image_path, output_image_path, { replace: true }, (err) => {
              if (err) {
                console.log(err);
                return;
              }
              console.log(id + " card is created at " + output_image_path);
            });
        }
    });
}

function get_profile_image(id) {

    let default_profile_image = "./templates/assets/profile.jpg";
    let image_formats = ['jpg', 'JPG', 'jpeg', 'JEPG', 'png', 'PNG'];
    for (let i=0; i<image_formats.length; i++) {
        let format = image_formats[i];
        let image_path = "./data/" + id + '.' + format;
        try {
          fs.statSync(image_path);
          return image_path;
        }
        catch(err) {
            // Intentionally left blank
        }
    }

    return default_profile_image;
}

function get_random_skill(blacklist_index) {

    let random_index;
    do
        random_index = Math.floor(Math.random() * preset_skills_len);
    while (random_index === blacklist_index);

    return {
        'index': random_index,
        'skill': preset_skills[random_index]
    }
}
