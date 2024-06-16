FROM node:18-alpine  

WORKDIR /app 

COPY package*.json ./ 

RUN npm install # Install dependencies

COPY . . 

EXPOSE 8545 

CMD ["npx", "hardhat", "node"] 
