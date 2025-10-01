import { getAccessToken } from './googleApi.js';
import { obtainDate } from './utils.js';

// Google Sheets Service Class
// Consolidates all Google Sheets operations with enhanced error handling, 
// data transformation, and batch operations

class GoogleSheetsService {
    constructor() {
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    // Enhanced error handling with retry logic
    async withRetry(operation, context = '') {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                console.warn(`${context} - Attempt ${attempt}/${this.retryAttempts} failed:`, error.message);
                
                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt); // Exponential backoff
                }
            }
        }
        
        console.error(`${context} - All retry attempts failed`);
        throw lastError;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Core CRUD operations with enhanced error handling
    async getSheetData(spreadsheetId, sheetName) {
        return this.withRetry(async () => {
            const accessToken = await getAccessToken();
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.values || [];
        }, `Getting data from sheet ${sheetName}`);
    }

    async appendSheetData(spreadsheetId, sheetName, newData) {
        return this.withRetry(async () => {
            const accessToken = await getAccessToken();
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        values: Array.isArray(newData[0]) ? newData : [newData],
                    }),
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (result.error) {
                throw new Error(`Sheets API error: ${result.error.message || 'Unknown error'}`);
            }
            return result;
        }, `Appending data to sheet ${sheetName}`);
    }

    async updateSheetData(spreadsheetId, range, values) {
        return this.withRetry(async () => {
            const accessToken = await getAccessToken();
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        values: values,
                    }),
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (result.error) {
                throw new Error(`Sheets API error: ${result.error.message || 'Unknown error'}`);
            }
            return result;
        }, `Updating range ${range} in spreadsheet`);
    }

    // True batch operations for better performance
    async batchUpdate(spreadsheetId, operations) {
        return this.withRetry(async () => {
            const accessToken = await getAccessToken();
            
            // Convert operations to Google Sheets batch format
            const requests = operations.map(op => {
                switch (op.type) {
                    case 'append':
                        return {
                            appendCells: {
                                sheetId: op.sheetId,
                                rows: op.data.map(row => ({
                                    values: row.map(cell => ({ userEnteredValue: { stringValue: String(cell) } }))
                                })),
                                fields: 'userEnteredValue'
                            }
                        };
                    case 'update':
                        return {
                            updateCells: {
                                range: {
                                    sheetId: op.sheetId,
                                    startRowIndex: op.startRow,
                                    endRowIndex: op.endRow,
                                    startColumnIndex: op.startCol,
                                    endColumnIndex: op.endCol
                                },
                                rows: op.data.map(row => ({
                                    values: row.map(cell => ({ userEnteredValue: { stringValue: String(cell) } }))
                                })),
                                fields: 'userEnteredValue'
                            }
                        };
                }
            });

            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ requests }),
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (result.error) {
                throw new Error(`Sheets API error: ${result.error.message || 'Unknown error'}`);
            }
            return result;
        }, `Batch updating spreadsheet ${spreadsheetId}`);
    }

    // Standardized row finding with flexible matching
    findRows(data, criteria) {
        if (!data || data.length <= 1) {
            return [];
        }

        const results = [];
        // Skip header row (index 0)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            let matches = true;

            // Check all criteria
            for (const [columnIndex, expectedValue] of Object.entries(criteria)) {
                const actualValue = row[parseInt(columnIndex)];
                
                if (typeof expectedValue === 'function') {
                    // Custom matching function
                    if (!expectedValue(actualValue, row, i)) {
                        matches = false;
                        break;
                    }
                } else if (typeof expectedValue === 'string' && typeof actualValue === 'string') {
                    // Case-insensitive string comparison
                    if (actualValue.toLowerCase() !== expectedValue.toLowerCase()) {
                        matches = false;
                        break;
                    }
                } else {
                    // Direct comparison (with type coercion for numbers)
                    if (actualValue != expectedValue) {
                        matches = false;
                        break;
                    }
                }
            }

            if (matches) {
                results.push({
                    rowIndex: i,
                    data: row
                });
            }
        }

        return results;
    }

    // Find a single row (returns first match)
    findRow(data, criteria) {
        const results = this.findRows(data, criteria);
        return results.length > 0 ? results[0] : null;
    }

    // Data transformation utilities
    transformRowToObject(row, columnMapping) {
        const obj = {};
        for (const [key, columnIndex] of Object.entries(columnMapping)) {
            obj[key] = row[columnIndex];
        }
        return obj;
    }

    transformObjectToRow(obj, columnMapping) {
        const row = new Array(Math.max(...Object.values(columnMapping)) + 1);
        for (const [key, columnIndex] of Object.entries(columnMapping)) {
            row[columnIndex] = obj[key];
        }
        return row;
    }

    // Participant-specific operations (consolidates app.js functions)
    async findParticipantByEmail(spreadsheetId, sheetName, email) {
        const data = await this.getSheetData(spreadsheetId, sheetName);
        const result = this.findRow(data, {
            1: email // Email is in column B (index 1)
        });

        if (!result) {
            return null;
        }

        const participantMapping = {
            participantId: 0,
            email: 1,
            name: 2,
            age: 3,
            gender: 4,
            nativeLanguage: 5,
            registrationTimestamp: 6
        };

        return this.transformRowToObject(result.data, participantMapping);
    }

    async saveNewParticipant(spreadsheetId, sheetName, participantData) {
        // Get existing data to find max ID
        const data = await this.getSheetData(spreadsheetId, sheetName);
        
        let maxId = 0;
        if (data && data.length > 1) {
            // Skip header row and find max ID
            for (let i = 1; i < data.length; i++) {
                const id = parseInt(data[i][0]);
                if (!isNaN(id) && id > maxId) {
                    maxId = id;
                }
            }
        }

        const newParticipantId = maxId + 1;
        
        const participantMapping = {
            participantId: 0,
            email: 1,
            name: 2,
            age: 3,
            gender: 4,
            nativeLanguage: 5,
            registrationTimestamp: 6
        };

        const participantWithId = {
            ...participantData,
            participantId: newParticipantId,
            registrationTimestamp: obtainDate()
        };

        const newRow = this.transformObjectToRow(participantWithId, participantMapping);
        await this.appendSheetData(spreadsheetId, sheetName, newRow);

        return participantWithId;
    }

    // Onomatopoeia-specific operations
    async loadOnomatopoeiaData(spreadsheetId, sheetName, participantId) {
        const data = await this.getSheetData(spreadsheetId, sheetName);
        const results = this.findRows(data, {
            0: participantId // Participant ID is in column A (index 0)
        });

        const onomatopoeiaMapping = {
            participantId: 0,
            participantName: 1,
            video: 2,
            movement: 3,
            startTime: 4,
            endTime: 5,
            answeredTimestamp: 6,
            hasAudio: 7,
            audioFileName: 8,
            emotion: 9
        };

        return results.map(result => 
            this.transformRowToObject(result.data, onomatopoeiaMapping)
        );
    }

    async saveOnomatopoeia(spreadsheetId, sheetName, onomatopoeiaData) {
        const onomatopoeiaMapping = {
            participantId: 0,
            participantName: 1,
            video: 2,
            movement: 3,
            startTime: 4,
            endTime: 5,
            answeredTimestamp: 6,
            hasAudio: 7,
            audioFileName: 8,
            emotion: 9
        };

        const row = this.transformObjectToRow(onomatopoeiaData, onomatopoeiaMapping);
        return await this.appendSheetData(spreadsheetId, sheetName, row);
    }
}

// Create singleton instance
const googleSheetsService = new GoogleSheetsService();

export { GoogleSheetsService, googleSheetsService };
