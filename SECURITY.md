# Security Policy

## Reporting Security Vulnerabilities

**Do not open public GitHub issues for security vulnerabilities.**

If you discover a security vulnerability in Kanbu, please report it responsibly by emailing:
**security@kanbu.dev** or **R.Waslander@gmail.com**

Please include:
- Description of the vulnerability
- - Steps to reproduce (if possible)
  - - Potential impact
    - - Any suggested fixes (optional)
     
      - We will acknowledge your report within 48 hours and provide updates on our progress toward a fix.
     
      - ## Security Features
     
      - Kanbu includes several security-focused features:
     
      - ### Access Control List (ACL) System
      - - **NTFS-style permissions** with Read, Write, Execute, Delete, and Permissions controls
        - - **Deny-first logic** where explicit deny entries override any grants
          - - **Permission inheritance** from workspace to project to task levels
            - - **Security groups** for managing permissions at scale
              - - **Audit logging** of all permission changes
               
                - ### Data Protection
                - - **HTTPS-only** communication (enforced on deployment)
                  - - **JWT token-based** authentication with configurable secrets
                    - - **Permission-based access** ensures Claude Code and API keys only access what the user allows
                      - - **Database encryption** recommended for production deployments
                        - - **Audit trail** of all user actions with export capabilities
                         
                          - ### Best Practices for Self-Hosted Deployments
                         
                          - 1. **Change Default Passwords**: Always change the PostgreSQL password and JWT_SECRET in `.env`
                            2. 2. **Use HTTPS**: Configure HTTPS/TLS for all production deployments
                               3. 3. **Secure Database**: Use strong PostgreSQL credentials and restrict network access
                                  4. 4. **Regular Backups**: Implement automated database backups
                                     5. 5. **Monitor Logs**: Regularly review audit logs for suspicious activity
                                        6. 6. **Keep Updated**: Update dependencies regularly using `pnpm update`
                                           7. 7. **Environment Variables**: Never commit `.env` files to version control
                                              8. 8. **API Key Management**: Rotate API keys regularly and revoke unused ones
                                                
                                                 9. ### Authentication & Authorization
                                                 10. - **Single Sign-On (SSO)** support via OAuth2 (configurable)
                                                     - - **Two-Factor Authentication** support (2FA)
                                                       - - **Session Management** with automatic timeout
                                                         - - **API Key Scoping** (User, Workspace, or Project level)
                                                          
                                                           - ### Third-Party Integrations
                                                           - - **Claude Code Integration**: Uses MCP protocol with permission inheritance
                                                             - - **GitHub Integration**: OAuth2-based with minimal required permissions
                                                               - - **Custom API Keys**: Generated with limited scopes
                                                                
                                                                 - ## Known Limitations
                                                                
                                                                 - - **Self-hosted deployments**: Security is dependent on proper configuration and maintenance
                                                                   - - **Claude Code access**: Currently requires explicit permission through pairing
                                                                     - - **Network exposure**: Always use VPN/firewall to restrict network access in production
                                                                      
                                                                       - ## Security Advisories
                                                                      
                                                                       - No known security vulnerabilities at this time.
                                                                      
                                                                       - For historical security issues and their resolutions, see: [GitHub Security Advisories](https://github.com/hydro13/kanbu/security/advisories)
                                                                      
                                                                       - ## Compliance
                                                                      
                                                                       - Kanbu can be deployed to meet various compliance requirements:
                                                                       - - **GDPR**: By using proper access controls and audit logging
                                                                         - - **HIPAA**: With encrypted storage and audit trails (requires additional configuration)
                                                                           - - **SOC 2**: With proper monitoring, backups, and access controls
                                                                            
                                                                             - ## Support
                                                                            
                                                                             - For security-related questions or concerns, please contact:
                                                                             - - Email: R.Waslander@gmail.com
                                                                               - - Security Issues: Use responsible disclosure via the email above
                                                                                
                                                                                 - ## License
                                                                                
                                                                                 - This security policy is part of the Kanbu project licensed under AGPL-3.0.
