const formidable = require("formidable");
const cloudinary = require("cloudinary").v2;
const { responseReturn } = require("../../utils/response");
const categoryModel = require('../../models/dashboard/categoryModel.js');
const slugify = require('slugify');
const fs = require('fs');

// cloudinary config (আপনি server entry তে একবারও করতে পারেন)
cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret,
    secure: true
});

// helper: safe conversion to string
function safeString(input) {
    if (input == null) return '';
    if (Array.isArray(input)) input = input[0];
    if (Buffer.isBuffer(input)) input = input.toString();
    if (typeof input !== 'string') input = String(input);
    return input;
}

class categoryController {
    add_category = async (req, res) => {
        const form = new formidable.IncomingForm({
            multiples: false,
            keepExtensions: true
            // uploadDir: path.join(__dirname, '../../tmp') // optional
        });

        form.parse(req, async (err, fields, files) => {
            console.log('fields:', fields);
            console.log('files:', files);

            if (err) {
                console.error('form.parse error:', err);
                return responseReturn(res, 500, { error: 'Form parse error' });
            }

            try {
                // -------------------------
                // 1) NAME: safe handling
                // -------------------------
                let nameRaw = safeString(fields.name);
                let name = nameRaw.trim();

                if (!name) {
                    return responseReturn(res, 400, { error: 'Category name is required' });
                }

                // slug: lower + strict chars only
                const slug = slugify(name, { lower: true, strict: true });

                // -------------------------
                // 2) IMAGE: safe handling
                // -------------------------
                // files.image may be an array or object depending on formidable config / client
                let imageField = files.image || files.file || files.images;
                if (!imageField) {
                    return responseReturn(res, 400, { error: 'Image file is required' });
                }

                // If it's an array (as your log shows), take first file
                const imageFile = Array.isArray(imageField) ? imageField[0] : imageField;

                // File path detection for different formidable versions
                const filePath = imageFile.filepath || imageFile.path || imageFile.tempFilePath;
                console.log('filePath:', filePath);

                if (!filePath) {
                    return responseReturn(res, 500, { error: 'Uploaded file path not found' });
                }

                // -------------------------
                // 3) UPLOAD to Cloudinary
                // -------------------------
                let result;
                try {
                    result = await cloudinary.uploader.upload(filePath, { folder: 'Category' });
                } catch (uploadErr) {
                    console.error('Cloudinary upload error:', uploadErr);
                    return responseReturn(res, 500, { error: 'Image upload failed', detail: uploadErr.message });
                }

                if (!result || (!result.secure_url && !result.url)) {
                    return responseReturn(res, 500, { error: 'Image upload returned no URL' });
                }

                // Optionally delete temp file after upload (good practice)
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.warn('Temp file delete error:', unlinkErr);
                });

                // -------------------------
                // 4) Save to DB
                // -------------------------
                const category = await categoryModel.create({
                    name,
                    slug,
                    image: result.secure_url || result.url
                });

                return responseReturn(res, 201, { category, message: 'Category added successfully' });

            } catch (error) {
                console.error('add_category error:', error);
                return responseReturn(res, 500, { error: 'Internal server error', detail: error.message });
            }
        });
    }

    // get category

    get_category = async (req, res) => {
        const { page, searchValue, perPage } = req.query;
        try {
            let skipPage =''
            if(perPage && page){
                 skipPage = parseInt(perPage) * (parseInt(page) - 1)
            }
            
            if(searchValue && page && perPage){
                 const categories = await categoryModel.find({
                    $text: {$search: searchValue}
                 }).skip(skipPage).limit(perPage).sort({ createdAt: -1 })
                 const totalCategory = await categoryModel.find({
                     $text: {$search: searchValue}
                 }).countDocuments()
                 responseReturn(res, 200, {totalCategory, categories})
            }
            else if(searchValue === '' && page && perPage){
                 const categories = await categoryModel.find({}).skip(skipPage).limit(perPage).sort({ createdAt: -1 })
                 const totalCategory = await categoryModel.find({}).countDocuments()
                 responseReturn(res, 200, {totalCategory, categories})
            }
            else{
                 const categories = await categoryModel.find({}).sort({ createdAt: -1 })
                 const totalCategory = await categoryModel.find({}).countDocuments()
                 responseReturn(res, 200, {totalCategory, categories})
            }
            
        } catch (err) {
            console.error('get_category error:', err);
            return responseReturn(res, 500, { error: 'Failed to fetch categories' });
        }
    }
}

module.exports = new categoryController();