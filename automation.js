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

const Promise = require("bluebird");
const readFile = Promise.promisify(require("fs").readFile);

const templates_dir = "./templates/"

const suit_red_hex = "#831a0d";
const suit_black_hex = "#212121";

const spade = {"name":"spade","code":"&#x2660;","color":suit_black_hex};
const heart = {"name":"heart","code":"&#x2665;","color":suit_red_hex};
const club = {"name":"club","code":"&#x2663;","color":suit_black_hex};
const diamond = {"name":"diamond","code":"&#x2666;","color":suit_red_hex};
const card_suits = [spade, heart, club, diamond];
const card_suits_dict = {"spade": 0, "heart": 1, "club": 2, "diamond": 3};
const card_numbers = ['A','2','3','4','5','6','7','8','9','X','J','Q','K'];
const card_suits_len = card_suits.length;
const card_numbers_len = card_numbers.length;

let suit_records = {};

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

console.log("Preparing for the preset card suit...");
let file_reading_promises = [];
let processed_profiles = [];

let files = fs.readdirSync(source_dir);
for (let i in files) {
    let file = files[i];
    if (file.endsWith(".json")) {
        file_reading_promises.push(readFile(source_dir + file, "utf8").then(function(contents) {

            let jsonContent = JSON.parse(contents);
            processed_profiles.push({
                "content": jsonContent,
                "source": source_dir + file
            });

            if (jsonContent.hasOwnProperty('card_suit')){
                let card_suit = jsonContent.card_suit;
                let suit_index =
                    card_suits_dict[jsonContent.card_suit.suit.toLowerCase()];
                suit_records[suit_index + '_' + card_suit.number] = 'true';
                console.log(card_suit.suit + ' ' + card_suit.number + ' is taken by ' + jsonContent.id);
            }
        }).catch(function(e) {
            console.log("Error reading file", e);
        }));
    }
}

Promise.all(file_reading_promises).then(function(results) {
   for (let i=0; i<processed_profiles.length; i++) {
       create_card(processed_profiles[i]);
   }
});

function create_card(processed_profile) {

    let dirty = false;

    let jsonContent = processed_profile.content;

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
        dirty = true;
    }

    let card_suit;
    if (jsonContent.hasOwnProperty('card_suit')){
        card_suit = jsonContent.card_suit;
        let suit_index = card_suits_dict[jsonContent.card_suit.suit.toLowerCase()];
        card_suit['color'] = card_suits[suit_index].color;
        card_suit['code'] = card_suits[suit_index].code;
        suit_records[suit_index + '_' + card_suit.number] = 'true';
    } else {
        card_suit = get_unique_suit();
        jsonContent['card_suit'] = {
            'suit':  card_suit.name,
            'number': card_suit.number
        }
        dirty = true;
    }

    console.log("Creating a card for " + id);

    if (dirty) {
        fs.writeFile(processed_profile.source, JSON.stringify(jsonContent, null, 4), (err) => {
          if (err) throw err;
          console.log('New contents are saved to ' + id + '\'profile');
        });
    }

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
        .replace("[skills]", skills)
        .replace("[suit-color]", card_suit.color)
        .replace("[card-suit]", card_suit.code)
        .replace("[card-number]", card_suit.number);

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

function get_unique_suit() {

    let suit, index, type;
    do {
        suit = Math.floor(Math.random() * card_suits_len);
        index = Math.floor(Math.random() * card_numbers_len);
        type = suit + '_' + index;
        //console.log("Inside do while loop...: " + type);
    } while (suit_records.hasOwnProperty(type));

    suit_records[type] = 'true';

    return  {
        "name": card_suits[suit].name,
        "code": card_suits[suit].code,
        "color": card_suits[suit].color,
        "number": card_numbers[index]
    }
}
