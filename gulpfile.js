var gulp = require('gulp');
var responsive = require('gulp-responsive');

// Resize all images
gulp.task('resize', () => {
    gulp.src('src_img/**/*')
    .pipe(responsive({
      // Resize all JPG images to three different sizes: 200, 500, and 630 pixels
      '*.jpg': [{
        width: 360,
        rename: { suffix: '' },
      }, {
        width: 420,
        rename: { suffix: '-420px' },
      }, {
        width: 560,
        rename: { suffix: '-600px' },  
      }, {
        // Compress, strip metadata, and rename original image
        width: 800,
        rename: { suffix: '-800px' },
      }]
    }))
    .pipe(gulp.dest('img'));
  });