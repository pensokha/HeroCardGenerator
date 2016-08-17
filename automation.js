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

// Configuration begins
const tmp_dir = './tmp/';
const output_dir = './outputs/';
const source_dir = "./data/";

let format = '.png';
let optimized = true;
// Configuration ends

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
    let image = get_profile_image(id);
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

    let default_profile_image = "./asset/profile.jpg";
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
