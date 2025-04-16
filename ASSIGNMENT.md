# Question 1

A lot of things are missing from this POC to be production ready.

A number of areas need some improvement.

## Data quality
- Some of the data stored on the S3 buckets contain encoding errors (e.g. "Pok\udc8emon GO"). These not being automatically fixable hints at the fact that the data source is of poor quality or that the ETL used to extract the data contains bugs.

## Data storage
- In this POC, data is stored on an SQLite database. While SQLite is fine for a POC, it lacks critical features for prime time use such as decentralized usage, non serialized or transactional write ops, backup solutions, limited storage capacity, sharding, clustering, user management and so on.
- Better replacements include more full-fledged RDBMS such as PostgreSQL that can act more or less as drop-in replacements by leveraging `sequelize`.
- NoSQL databases such as MongoDB might also be a good fit depending on the desired data structure (the json data stored on S3 here is perfectly suitable), schema flexibility needs and storage size.

## Code quality
- Unit and integration testing are a must to prevent feature regression

## Security
- Some routes need to be user restricted, games creation and deletion in particular.
- Public routes need to have, at least, a basic quota in order to prevent DDoS attacks.
- Errors are returned in plain, they need to be reinterpreted in order to prevent reverse engineering of internal resources.
- Fix the npm vulnerabilities. I removed all the unused packages but sequelized needs to be upgraded in order to mitigate a critical vulnerability. Code changes are necessary, this is considered out of the scope of this exercise.

## Maintenance
- Logging needs to be implemented to make maintenance and debugging feasible.
- Some basic monitoring would also be necessary to, at least, ensure the application is up and track the route performance.

## Performance
- This application returns the same set of data 99.99% of the time. Relying on caches would be a good idea to reduce cost and latency. Caches can be managed on every level, in the browser (e.g. PWA), on the web server level (e.g. nginx) or on the software level (e.g. this nodejs project) by using an in-memory database (e.g. redis).
- gzip data in order to save on bandwidth.

# Question 2

There are two ways to go about this reliably, either the data side triggers the API refresh or it goes through the API to update the bucket. Alternatively, one could rely on time but that would not be reliable.

## Solution 1

Set up S3 notifications to listen to the bucket updates (https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html) using a Lambda function. Once the event is triggered following a data update, call a private API to refresh the data. Or, even better, don't use the populate API at all and set up a separate ETL micro service.

This solution relies heavily on AWS and allows the project to leverage its monitoring. Infra cost would be negligeable but it also makes the project dependency on AWS stronger. Moreover, this solution is infrastructure related which makes maintenance harder in case of unexpected issues.

## Solution 2

Go through a code solution instead of infra. Make an ETL micro service that updates both the database and S3 at the same time. The data team would use this one instead of directly accessing S3. This offers increased control and security over the process at the cost of more development and maintenance.