### To revise website locally, python backend does not run

  Features that NEED the Python backend (on VPS):                                           
  - User auth (register, login, token refresh, profile)                                     
  - Stripe payments (checkout, webhooks)                                                    
  - User progress tracking (save/load)                                                      
                                                                                            
  Features that DON'T need it (work client-side or via SvelteKit):                          
  - Terminal command execution — fully simulated in the browser                             
  - Template file serving — SvelteKit fallback route handles this                           
  - Storyline/narrative content — hardcoded in frontend TypeScript                          
  - Bioinformatics analysis endpoints — defined in backend but never actually called (stubs)
