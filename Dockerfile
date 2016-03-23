FROM node:argon

# Create app directory
RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/app/views
WORKDIR /usr/src/app

# Bundle app source
COPY * /usr/src/app/
COPY views/ /usr/src/app/views/

# Install app dependencies
#COPY package.json /usr/src/app/
RUN cd /usr/src/app/
RUN npm install

EXPOSE 8777

CMD [ "npm", "start" ]
