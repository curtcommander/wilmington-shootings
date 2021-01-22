#pip3 install --system --target layer/python requests
#pip3 install --system --target layer/python bs4
#pip3 install --system --target layer/python pandas
#pip3 install --system --target layer/python htmlmin

cp python/config.py layer/python
cp python/utils.py layer/python

rm zip/layer.zip
cd layer; zip -r ../zip/layer.zip *; cd ..