const test = require('node:test');
const assert = require('node:assert/strict');

process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';

const cloudinary = require('../config/cloudinary');
const GalleryImage = require('../models/GalleryImage');
const SalonSettings = require('../models/SalonSettings');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const { deleteImage } = require('./galleryController');
const { updateService } = require('./serviceController');
const { updateHomePageImage } = require('./settingsController');
const { updateStaff } = require('./staffController');

const VALID_ID = '64b64c3f2f5f5b1c8c123456';
const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const createUploadedFile = (filename) => ({
  filename,
  path: `https://res.cloudinary.com/test-cloud/image/upload/v1/${filename}.jpg`,
});

test('service update deletes the new upload and preserves the old image when the database update fails', async (t) => {
  const originalFindById = Service.findById;
  const originalFindByIdAndUpdate = Service.findByIdAndUpdate;
  const originalDestroy = cloudinary.uploader.destroy;
  const destroyedAssets = [];

  Service.findById = async () => ({
    _id: VALID_ID,
    image: 'https://res.cloudinary.com/test-cloud/image/upload/v1/services/old.jpg',
    imagePublicId: 'services/old',
  });
  Service.findByIdAndUpdate = async () => { throw new Error('database validation failed'); };
  cloudinary.uploader.destroy = async (publicId) => { destroyedAssets.push(publicId); };

  t.after(() => {
    Service.findById = originalFindById;
    Service.findByIdAndUpdate = originalFindByIdAndUpdate;
    cloudinary.uploader.destroy = originalDestroy;
  });

  const res = createResponse();
  await updateService({
    params: { id: VALID_ID },
    body: {},
    file: createUploadedFile('services/new'),
  }, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(destroyedAssets, ['services/new']);
});

test('service update retires the old image only after the database update succeeds', async (t) => {
  const originalFindById = Service.findById;
  const originalFindByIdAndUpdate = Service.findByIdAndUpdate;
  const originalDestroy = cloudinary.uploader.destroy;
  const destroyedAssets = [];

  Service.findById = async () => ({
    _id: VALID_ID,
    image: 'https://res.cloudinary.com/test-cloud/image/upload/v1/services/old.jpg',
    imagePublicId: 'services/old',
  });
  Service.findByIdAndUpdate = async () => ({ _id: VALID_ID, image: 'new-image' });
  cloudinary.uploader.destroy = async (publicId) => { destroyedAssets.push(publicId); };

  t.after(() => {
    Service.findById = originalFindById;
    Service.findByIdAndUpdate = originalFindByIdAndUpdate;
    cloudinary.uploader.destroy = originalDestroy;
  });

  const res = createResponse();
  await updateService({
    params: { id: VALID_ID },
    body: {},
    file: createUploadedFile('services/new'),
  }, res);
  await Promise.resolve();

  assert.equal(res.statusCode, 200);
  assert.deepEqual(destroyedAssets, ['services/old']);
});

test('staff update deletes the new upload and preserves the old image when the database update fails', async (t) => {
  const originalFindById = Staff.findById;
  const originalFindByIdAndUpdate = Staff.findByIdAndUpdate;
  const originalDestroy = cloudinary.uploader.destroy;
  const destroyedAssets = [];

  Staff.findById = async () => ({
    _id: VALID_ID,
    imageUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/staff/old.jpg',
    imagePublicId: 'staff/old',
  });
  Staff.findByIdAndUpdate = async () => { throw new Error('database validation failed'); };
  cloudinary.uploader.destroy = async (publicId) => { destroyedAssets.push(publicId); };

  t.after(() => {
    Staff.findById = originalFindById;
    Staff.findByIdAndUpdate = originalFindByIdAndUpdate;
    cloudinary.uploader.destroy = originalDestroy;
  });

  const res = createResponse();
  await updateStaff({
    params: { id: VALID_ID },
    body: {},
    file: createUploadedFile('staff/new'),
  }, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(destroyedAssets, ['staff/new']);
});

test('staff update retires the old image only after the database update succeeds', async (t) => {
  const originalFindById = Staff.findById;
  const originalFindByIdAndUpdate = Staff.findByIdAndUpdate;
  const originalDestroy = cloudinary.uploader.destroy;
  const destroyedAssets = [];

  Staff.findById = async () => ({
    _id: VALID_ID,
    imageUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/staff/old.jpg',
    imagePublicId: 'staff/old',
  });
  Staff.findByIdAndUpdate = async () => ({ _id: VALID_ID, imageUrl: 'new-image' });
  cloudinary.uploader.destroy = async (publicId) => { destroyedAssets.push(publicId); };

  t.after(() => {
    Staff.findById = originalFindById;
    Staff.findByIdAndUpdate = originalFindByIdAndUpdate;
    cloudinary.uploader.destroy = originalDestroy;
  });

  const res = createResponse();
  await updateStaff({
    params: { id: VALID_ID },
    body: {},
    file: createUploadedFile('staff/new'),
  }, res);
  await Promise.resolve();

  assert.equal(res.statusCode, 200);
  assert.deepEqual(destroyedAssets, ['staff/old']);
});

test('home page image update cleans the new upload when persistence fails', async (t) => {
  const originalFindOneAndUpdate = SalonSettings.findOneAndUpdate;
  const originalDestroy = cloudinary.uploader.destroy;
  const destroyedAssets = [];

  SalonSettings.findOneAndUpdate = async () => ({
    salonInteriorImage: 'old-image',
    salonInteriorPublicId: 'settings/old',
    async save() { throw new Error('database validation failed'); },
  });
  cloudinary.uploader.destroy = async (publicId) => { destroyedAssets.push(publicId); };

  t.after(() => {
    SalonSettings.findOneAndUpdate = originalFindOneAndUpdate;
    cloudinary.uploader.destroy = originalDestroy;
  });

  const res = createResponse();
  await updateHomePageImage({
    params: { imageKey: 'salonInterior' },
    file: createUploadedFile('settings/new'),
  }, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(destroyedAssets, ['settings/new']);
});

test('home page image update retires the old asset only after persistence', async (t) => {
  const originalFindOneAndUpdate = SalonSettings.findOneAndUpdate;
  const originalDestroy = cloudinary.uploader.destroy;
  const events = [];
  const settings = {
    salonInteriorImage: 'old-image',
    salonInteriorPublicId: 'settings/old',
    async save() {
      events.push('database-saved');
      return this;
    },
  };

  SalonSettings.findOneAndUpdate = async () => settings;
  cloudinary.uploader.destroy = async (publicId) => { events.push(`destroy:${publicId}`); };

  t.after(() => {
    SalonSettings.findOneAndUpdate = originalFindOneAndUpdate;
    cloudinary.uploader.destroy = originalDestroy;
  });

  const res = createResponse();
  await updateHomePageImage({
    params: { imageKey: 'salonInterior' },
    file: createUploadedFile('settings/new'),
  }, res);
  await Promise.resolve();

  assert.equal(res.statusCode, 200);
  assert.deepEqual(events, ['database-saved', 'destroy:settings/old']);
});

test('gallery deletion commits the database delete before Cloudinary cleanup', async (t) => {
  const originalFindById = GalleryImage.findById;
  const originalFindByIdAndDelete = GalleryImage.findByIdAndDelete;
  const originalDestroy = cloudinary.uploader.destroy;
  const events = [];

  GalleryImage.findById = async () => ({
    publicId: 'gallery/old',
    imageUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/gallery/old.jpg',
  });
  GalleryImage.findByIdAndDelete = async () => { events.push('database-deleted'); };
  cloudinary.uploader.destroy = async (publicId) => { events.push(`destroy:${publicId}`); };

  t.after(() => {
    GalleryImage.findById = originalFindById;
    GalleryImage.findByIdAndDelete = originalFindByIdAndDelete;
    cloudinary.uploader.destroy = originalDestroy;
  });

  const res = createResponse();
  await deleteImage({ params: { id: VALID_ID } }, res);
  await Promise.resolve();

  assert.equal(res.statusCode, 200);
  assert.deepEqual(events, ['database-deleted', 'destroy:gallery/old']);
});
