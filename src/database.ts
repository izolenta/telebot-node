import mysql, { RowDataPacket } from 'mysql2/promise';

export class Database {
  private con: mysql.Connection;

  constructor(config: {
    host: string;
    user: string;
    password: string;
    database: string;
  }) {
    this.init(config);
  }

  private async init(config: {
    host: string;
    user: string;
    password: string;
    database: string;
  }): Promise<void> {
    this.con = await mysql.createConnection(config);
  }

  public async getRole(username: string): Promise<number> {
    const data = await this.con.query(`SELECT role FROM users WHERE username = ?`, username);
    return data[0][0].role;
  }

  public async getAllData(username: string): Promise<any> {
    const data = await this.con.query(`SELECT role, personality, mode, last_message, gpt_model FROM users u INNER JOIN states s WHERE u.id = s.user_id AND u.username = ?`, username);
    return data[0][0];
  }

  public async setAssistant(username: string, assistant: string): Promise<void> {
    await this.con.query(`UPDATE states SET personality = ? WHERE user_id = (SELECT id FROM users WHERE username = ?)`, [assistant, username]);
  }

  public async setMode(username: string, mode: number): Promise<void> {
    await this.con.query(`UPDATE states SET mode = ? WHERE user_id = (SELECT id FROM users WHERE username = ?)`, [mode, username]);
  }

  public async setGptModel(username: string, model: string): Promise<void> {
    await this.con.query(`UPDATE states SET gpt_model = ? WHERE user_id = (SELECT id FROM users WHERE username = ?)`, [model, username]);
  }

  public async createSession(username: string): Promise<void> {
    await this.con.query(`UPDATE states SET session_id = ((SELECT maxval FROM (SELECT MAX(session_id) AS maxval FROM states) AS sub_selected_value) + 1) WHERE user_id = (SELECT id FROM users WHERE username = ?)`, [username]);
    await this.con.query(`DELETE FROM sessions WHERE session_id < ((SELECT maxval FROM (SELECT MAX(session_id) AS maxval FROM states) AS sub_selected_value) + 1) AND user_id = (SELECT id FROM users WHERE username = ?)`, [username]);
  }

  public async setContextMessage(username: string, isIncoming: boolean, text: string): Promise<void> {
    const data = await this.con.query(`SELECT session_id, user_id FROM states WHERE user_id = (SELECT id FROM users WHERE username = ?)`, username);
    await this.con.query(`INSERT INTO sessions (session_id, user_id, message, incoming, timestamp) VALUES (?, ?, ?, ?, ?)`, [data[0][0].session_id, data[0][0].user_id, text, isIncoming, new Date()]);
  }


  public async getContextMessages(username: string): Promise<any[]> {
    const messages: { role: string; content: string }[] = [];
    const wrapper = (await this.con.query(`SELECT personality, session_id FROM users u INNER JOIN states s WHERE u.id = s.user_id AND u.username = ?`, username))[0] as RowDataPacket[][];
    messages.push({ "role": "system", "content": 'You are ' + wrapper[0][0].personality });

    const msgs = (await this.con.query(`SELECT message, incoming FROM sessions WHERE session_id = ? ORDER BY timestamp`, wrapper[0][0].session_id))[0] as RowDataPacket[][];
    for (const next of msgs[0]) {
      if (next.incoming === 0) {
        messages.push({ 'role': 'user', 'content': next.message });
      }
      else {
        messages.push({ 'role': 'assistant', 'content': next.message });
      }
    }
    return messages;
  }

  public async updateTimestamp(username: string): Promise<void> {
    await this.con.query(`UPDATE states SET last_message = ? WHERE user_id = (SELECT id FROM users WHERE username = ?)`, [new Date(), username]);
  }
}
