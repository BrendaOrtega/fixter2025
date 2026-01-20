// Re-export from sesTransport for backwards compatibility
// TODO: Update all imports to use ~/utils/sesTransport directly
export {
  getSesTransport,
  getSesRemitent,
  getSesTransportForWebinar,
  sendSesEmailDirect,
  getSesTransport as sendgridTransport, // Legacy alias - uses SES now
} from "./sesTransport";
