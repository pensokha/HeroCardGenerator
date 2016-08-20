"use strict"
const fs = require('fs');
const copydir = require('copy-dir');

let card_template = " \
<a> \
	<figure> \
		<img src=[image_path] style=\"background-color:white;\"> \
		<figcaption> \
		</figcaption> \
	</figure> \
</a>"


let source_dir = "../outputs/";
let build_dir = "./";
let images_relative_path = "./images/"
let images_dir = build_dir + images_relative_path;

if (!fs.existsSync(build_dir)) {
    fs.mkdirSync(build_dir);
}

if (!fs.existsSync(images_dir)) {
    fs.mkdirSync(images_dir);
}

fs.createReadStream('./gallery.css').pipe(fs.createWriteStream(build_dir + '/gallery.css'));

copydir.sync(source_dir, images_dir);

let images_section = "";
let files = fs.readdirSync(images_dir);
for (let i in files) {
  let file = files[i];
  if (file.endsWith(".png")) {
		let file_path = images_relative_path + file;
		images_section += card_template.replace("[image_path]", file_path);
	}
}

let template = fs.readFileSync("./index_template.html");
let processed_content = template.toString().replace("[images_section]", images_section);

fs.writeFileSync( build_dir + "/index.html", processed_content);
console.log("New index.html has been saved.");

console.log("Done!");

//https://www.sitepoint.com/using-modern-css-to-build-a-responsive-image-grid/
