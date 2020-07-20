FROM node

RUN apt-get update && apt-get -y install tesseract-ocr libtesseract-dev tesseract-ocr-chi-sim
RUN apt-get update && apt-get -y install python3-pip 
RUN pip3 install pytesseract opencv-python

RUN git clone https://github.com/edwin-wang/recognize-trading
RUN npm install
EXPOSE 3000
CMD npm start