# minify js
 find js/ -type f \
    -name "*.js" ! -name "*.min.*" \
    -exec terser -c toplevel -o {}.min -- {} \; \
    -exec rm {} \; \
    -exec mv {}.min {} \; \
    -exec echo "minified "{} \;

# minify css
find css/ -type f \
    -name "*.css" ! -name "*.min.*" \
    -exec cleancss -o {}.min {} \; \
    -exec rm {} \; \
    -exec mv {}.min {} \; \
    -exec echo "minified "{} \;