# Project 1

## Step 1: Install Node Modules

In order to use this Max patch, you will need to install the modules not provided by Max into Node.

Go to a terminal and run: npm install
This will add and fill a folder called node_modules to the project directory.

## Step 2: Add midi files (optional)
Copy midi files you want to use into the /midi directory, which is the default directory the server uses for finding files. Optionally, you can edit a message in the patcher to explicitly set the folder the server looks in, as long as it's a known path in Max.

## Step 3: Open the patch
Open the patch 'project1.maxpat' in Max.

## Step 4: Make sure the node script is running
This should autostart when Max starts, but you can look in the Node Debugger window to make sure the script is in the running state free of errors.

## Step 5: Set your midi file directory (if necessary)
You can either copy your files in the project's 'midi' directory, or you can set the file list to come from a different directory by editing the string values in the message and hitting the button. This directory needs to be a known directory by Max.

## Step 6: Play the composition
Follow the steps outlined for the composition to generate a new composition.



