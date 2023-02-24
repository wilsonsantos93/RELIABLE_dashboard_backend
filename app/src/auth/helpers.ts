import bcrypt from "bcrypt";

/**
 * Compare hash password Function 
 */
export async function comparePassword(userPassword: string, candidatePassword: string) {
    try {
        const match = await bcrypt.compare(candidatePassword, userPassword);
        return match;
    } catch (error) {
        throw error;
    } 
}


/**
 * Password hash Function 
 */
export async function hashPassword(password: string) {
    const SALT_WORK_FACTOR = 10;
    try {
        const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
        const hash = await bcrypt.hash(password, SALT_WORK_FACTOR);
        return hash;
    } catch (error) {
        throw error;
    }
}


/**
 * Generate API Key Function 
 */
export function genAPIKey() {
    //create a base-36 string that contains 32 chars in a-z,0-9
    return [...Array(32)]
      .map(() => ((Math.random() * 36) | 0).toString(36))
      .join('');
  };