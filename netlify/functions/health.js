import service from '../../api/health.cjs'
export const handler = async event => event.httpMethod === 'GET' ? service.health() : {statusCode:405,body:'Method not allowed'}
